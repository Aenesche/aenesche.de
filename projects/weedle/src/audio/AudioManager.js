// Audio-System. Alles prozedural über die Web Audio API — keine Asset-Dateien.
//
// SFX: kurze, weiche Töne mit sanften Hüllkurven (bewusst „relaxed", keine
//      harten Attacks). Jeder Sound ist eine kleine Rezeptur aus Oszillatoren.
// Musik: endlose Lofi-Schleife aus Jazz-Akkorden (Pad + Bass + Vinyl-Rauschen),
//      läuft ohne Loop-Punkt und wiederholt sich dadurch nie exakt.
//
// Später echte Dateien einhängen: setMusicFile(url) bzw. playVoice(url).
// Der AudioContext startet erst nach einer User-Geste (Browser-Vorgabe) —
// unlock() wird von den Scenes bei Klick/Taste aufgerufen.

import { Storage } from '../storage/storage.js';

const SETTINGS_KEY = 'audioSettings';

// Note (MIDI) → Frequenz
const f = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// Mehrere Lofi-"Songs": je eine Akkordfolge + eigenes Tempo/Feeling.
// Ein Akkord läuft über 2 Takte 4/4; auf jeden Schlag kommt eine Hi-Hat
// (8 Schläge pro Akkord). Nach ein paar Durchläufen faded der Song raus
// und der nächste (zufällig ein anderer) beginnt.
const SONGS = [
    {
        name: 'dusk',
        bpm: 72,
        swing: 0.14,
        chords: [
            [50, 57, 60, 65],  // Dm7
            [43, 59, 62, 65],  // G7
            [48, 55, 59, 64],  // Cmaj7
            [45, 55, 60, 64],  // Am7
        ],
    },
    {
        name: 'haze',
        bpm: 66,
        swing: 0.18,
        chords: [
            [47, 54, 57, 62],  // Bm7
            [52, 59, 62, 66],  // Em7
            [45, 52, 57, 60],  // Am9-ish
            [40, 56, 59, 62],  // Abmaj7-ish / D7
        ],
    },
    {
        name: 'neon',
        bpm: 80,
        swing: 0.1,
        chords: [
            [48, 55, 60, 64],  // Cmaj7
            [53, 60, 64, 69],  // Fmaj7
            [50, 57, 60, 65],  // Dm7
            [43, 59, 62, 65],  // G7
        ],
    },
    {
        name: 'drift',
        bpm: 60,
        swing: 0.2,
        chords: [
            [46, 53, 57, 62],  // Bbmaj7-ish
            [44, 51, 55, 60],  // Abmaj7
            [49, 56, 59, 64],  // Dbmaj7-ish
            [42, 57, 60, 64],  // Gm-ish resolve
        ],
    },
];

// Drum-Styles, mit denen jede Progression kombiniert wird:
//   'none'  → nur Pad + Bass (ruhig)
//   'swing' → Hi-Hats mit Swing + Soft-Kick (der groovy Lofi-Beat)
//   'plain' → 6/8-Feel ohne Swing: Bass/Kick auf 1, Snare auf 4, gerade Hats
// Jede Progression × jeder Style = eine Variante in der Rotation.
const DRUM_STYLES = ['none', 'swing', 'plain'];

const VARIANTS = [];
for (const song of SONGS) {
    for (const drums of DRUM_STYLES) {
        VARIANTS.push({ ...song, drums });
    }
}

class AudioManager {
    constructor() {
        this.ctx = null;
        this.ready = false;

        const saved = Storage.load(SETTINGS_KEY);
        this.musicVolume = saved?.musicVolume ?? 0.35;
        this.sfxVolume = saved?.sfxVolume ?? 0.6;

        this.musicPlaying = false;
        this._musicTimer = null;
        this._musicFileSource = null;
        this._song = null;
        this._chordIndex = 0;
        this._chordsUntilSwitch = 0;
    }

    // Wird beim ersten User-Input aufgerufen
    unlock() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            this.ctx = new AC();

            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);

            // Separater Knoten NUR für Song-Crossfades — hält den
            // Lautstärke-Regler (musicGain) unangetastet.
            this.musicFade = this.ctx.createGain();
            this.musicFade.gain.value = 1;
            this.musicFade.connect(this.musicGain);

            this.ready = true;
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    persist() {
        Storage.save(SETTINGS_KEY, {
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
        });
    }

    setMusicVolume(v) {
        this.musicVolume = Math.max(0, Math.min(1, v));
        if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
        this.persist();
    }

    setSfxVolume(v) {
        this.sfxVolume = Math.max(0, Math.min(1, v));
        if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
        this.persist();
    }

    // --- Bausteine ---

    // Ein Ton mit weicher Hüllkurve
    tone({ freq, dur = 0.25, type = 'sine', gain = 0.3, attack = 0.02, delay = 0,
           detune = 0, sweepTo = null, dest = null }) {
        if (!this.ready) return;
        const t0 = this.ctx.currentTime + delay;

        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
        if (detune) osc.detune.value = detune;

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

        osc.connect(g);
        g.connect(dest || this.sfxGain);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
    }

    // Kurzes Rauschen (Klicks, Vinyl)
    noise({ dur = 0.1, gain = 0.1, filterFreq = 2000, delay = 0, dest = null }) {
        if (!this.ready) return;
        const t0 = this.ctx.currentTime + delay;
        const frames = Math.floor(this.ctx.sampleRate * dur);
        const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

        const src = this.ctx.createBufferSource();
        src.buffer = buf;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq;

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(gain, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

        src.connect(filter); filter.connect(g); g.connect(dest || this.sfxGain);
        src.start(t0);
    }

    // --- SFX ---

    play(name) {
        if (!this.ready) return;
        switch (name) {
            case 'buy':      // Samen kaufen: kurzer, freundlicher Blip
                this.tone({ freq: f(72), dur: 0.12, type: 'triangle', gain: 0.22 });
                break;
            case 'plant':    // Einpflanzen: weicher, tiefer Ton
                this.tone({ freq: f(55), dur: 0.3, type: 'sine', gain: 0.25 });
                this.tone({ freq: f(67), dur: 0.22, type: 'sine', gain: 0.12, delay: 0.04 });
                break;
            case 'harvest':  // Ernten: aufsteigender Zweiklang
                this.tone({ freq: f(69), dur: 0.16, type: 'triangle', gain: 0.2 });
                this.tone({ freq: f(76), dur: 0.28, type: 'triangle', gain: 0.18, delay: 0.09 });
                break;
            case 'pickup':   // Item aufheben
                this.tone({ freq: f(74), dur: 0.09, type: 'sine', gain: 0.16 });
                break;
            case 'drop':     // Item ablegen
                this.tone({ freq: f(62), dur: 0.11, type: 'sine', gain: 0.16 });
                break;
            case 'sell':     // Verkauf: sanfte „Kassen"-Terz
                this.tone({ freq: f(76), dur: 0.18, type: 'triangle', gain: 0.22 });
                this.tone({ freq: f(83), dur: 0.34, type: 'triangle', gain: 0.2, delay: 0.07 });
                this.tone({ freq: f(88), dur: 0.4, type: 'sine', gain: 0.1, delay: 0.14 });
                break;
            case 'build':    // Station bauen: satter Aufbau
                this.tone({ freq: f(48), dur: 0.5, type: 'sine', gain: 0.28, sweepTo: f(60) });
                this.tone({ freq: f(67), dur: 0.35, type: 'triangle', gain: 0.14, delay: 0.12 });
                break;
            case 'upgrade':  // Upgrade: heller Aufstieg
                [72, 76, 79, 84].forEach((n, i) =>
                    this.tone({ freq: f(n), dur: 0.22, type: 'triangle', gain: 0.16, delay: i * 0.06 }));
                break;
            case 'trash':    // Entsorgen
                this.noise({ dur: 0.25, gain: 0.12, filterFreq: 900 });
                this.tone({ freq: f(45), dur: 0.2, type: 'sine', gain: 0.14 });
                break;
            case 'tick':     // Kunde wird ungeduldig: dezenter Klick
                this.noise({ dur: 0.035, gain: 0.07, filterFreq: 3500 });
                break;
            case 'error':    // Nicht möglich
                this.tone({ freq: f(46), dur: 0.18, type: 'sine', gain: 0.16 });
                break;
            case 'blip':     // Dialog-Schreibmaschine
                this.tone({ freq: f(70 + Math.floor(Math.random() * 4)), dur: 0.05,
                            type: 'square', gain: 0.05 });
                break;
            case 'levelComplete':
                [60, 64, 67, 72, 76].forEach((n, i) =>
                    this.tone({ freq: f(n), dur: 0.6, type: 'triangle', gain: 0.2, delay: i * 0.11 }));
                break;
            case 'uiClick':
                this.tone({ freq: f(68), dur: 0.07, type: 'sine', gain: 0.14 });
                break;
        }
    }

    // --- Musik ---

    startMusic() {
        if (!this.ready || this.musicPlaying) return;
        if (this._musicFileSource) return; // externe Datei läuft
        this.musicPlaying = true;
        this._pickSong();
        this._scheduleChord();
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this._musicTimer) { clearTimeout(this._musicTimer); this._musicTimer = null; }
    }

    // Neuen Song wählen (möglichst nicht denselben wie zuletzt)
    _pickSong() {
        let next;
        do {
            next = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
        } while (VARIANTS.length > 1 && next === this._song);
        this._song = next;
        this._chordIndex = 0;
        // 2–4 komplette Durchläufe, dann Songwechsel
        const loops = 2 + Math.floor(Math.random() * 3);
        this._chordsUntilSwitch = this._song.chords.length * loops;
    }

    // Ein Akkord = 2 Takte 4/4. Pad + Bass + 8 Hi-Hats + Vinyl.
    // Am Ende eines Songs sanfter Crossfade in den nächsten.
    _scheduleChord() {
        if (!this.musicPlaying || !this.ready) return;

        const song = this._song;
        const beat = 60 / song.bpm;      // Sekunden pro Schlag
        const dur = beat * 8;            // 2 Takte = 8 Schläge
        const chord = song.chords[this._chordIndex % song.chords.length];
        const t0 = this.ctx.currentTime;

        // Fade-Zustand: letzter Akkord des Songs → ausblenden
        const isLast = this._chordsUntilSwitch <= 1;
        const isFirstOfSong = this._chordIndex === 0;

        // Pad-Lautstärke für Crossfade rampen
        if (isFirstOfSong) {
            this.musicFade.gain.cancelScheduledValues(t0);
            this.musicFade.gain.setValueAtTime(0.05, t0);
            this.musicFade.gain.exponentialRampToValueAtTime(1, t0 + dur * 0.5);
        } else if (isLast) {
            this.musicFade.gain.cancelScheduledValues(t0);
            this.musicFade.gain.setValueAtTime(1, t0);
            this.musicFade.gain.exponentialRampToValueAtTime(0.05, t0 + dur * 0.9);
        }

        // Pad: verstimmte Sinus-Paare, sehr weich
        for (const note of chord) {
            for (const det of [-6, 6]) {
                this.tone({
                    freq: f(note + 12), dur: dur * 0.95, type: 'sine',
                    gain: 0.05, attack: dur * 0.28, detune: det, dest: this.musicFade,
                });
            }
        }

        // Bass: Grundton, tief und rund, plus leichter Wechsel auf Takt 2
        this.tone({ freq: f(chord[0] - 12), dur: dur * 0.45, type: 'sine',
                    gain: 0.13, attack: 0.12, dest: this.musicFade });
        this.tone({ freq: f(chord[0] - 12), dur: dur * 0.4, type: 'sine',
                    gain: 0.1, attack: 0.1, delay: dur * 0.5, dest: this.musicFade });

        // --- Drums je nach Style ---
        if (song.drums === 'swing') {
            // Hi-Hats: eine pro Schlag (8), Offbeats mit Swing verzögert
            for (let i = 0; i < 8; i++) {
                const swingShift = (i % 2 === 1) ? beat * song.swing : 0;
                const accent = (i % 2 === 0) ? 1 : 0.6;
                this._hihat(i * beat + swingShift, accent, i % 4 === 2);
            }
            // Soft-Kick auf 1 und 3
            this._kick(0);
            this._kick(4 * beat);
        } else if (song.drums === 'plain') {
            // 6/8-Feel: zwei Gruppen à 3 Schläge, gerade (kein Swing).
            // Bass/Kick auf die 1 jeder Gruppe, Snare auf die 4 (= Gruppe 2, Schlag 1).
            // 8 Schläge → Raster in 6 Achtel umdeuten: Schrittweite dur/6.
            const step = dur / 6;
            for (let i = 0; i < 6; i++) {
                const accent = (i === 0 || i === 3) ? 1 : 0.55; // Zählzeit 1 & 4 betont
                this._hihat(i * step, accent, false);
            }
            this._kick(0);          // 1
            this._snare(3 * step);  // 4
        }
        // 'none' → keine Drums

        // Bei ruhigen Varianten das Vinyl minimal präsenter (sonst zu leer)
        const vinylCount = song.drums === 'none' ? 6 : 4;

        // Vinyl-Knistern
        for (let k = 0; k < vinylCount; k++) {
            this.noise({ dur: 0.04, gain: 0.02, filterFreq: 1600,
                         delay: Math.random() * dur, dest: this.musicFade });
        }

        // Nächsten Akkord planen
        this._chordIndex++;
        this._chordsUntilSwitch--;
        if (this._chordsUntilSwitch <= 0) {
            // Song ist aus → nächsten wählen, nahtlos weiter
            this._musicTimer = setTimeout(() => {
                if (!this.musicPlaying) return;
                this._pickSong();
                this._scheduleChord();
            }, dur * 1000);
        } else {
            this._musicTimer = setTimeout(() => this._scheduleChord(), dur * 1000);
        }
    }

    // Kurze, weiche Hi-Hat (gefiltertes Rauschen)
    _hihat(delay, accent = 1, open = false) {
        if (!this.ready) return;
        const dur = open ? 0.12 : 0.04;
        const t0 = this.ctx.currentTime + delay;
        const frames = Math.floor(this.ctx.sampleRate * dur);
        const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 7000;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.05 * accent, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(hp); hp.connect(g); g.connect(this.musicFade);
        src.start(t0);
    }

    // Weicher Kick: kurzer Sinus-Sweep nach unten
    _kick(delay) {
        if (!this.ready) return;
        const t0 = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, t0);
        osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.12);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.09, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        osc.connect(g); g.connect(this.musicFade);
        osc.start(t0); osc.stop(t0 + 0.2);
    }

    // Weiche Snare: kurzes gefiltertes Rauschen + leiser Body-Ton
    _snare(delay) {
        if (!this.ready) return;
        const t0 = this.ctx.currentTime + delay;
        const dur = 0.16;
        const frames = Math.floor(this.ctx.sampleRate * dur);
        const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1900;
        bp.Q.value = 0.7;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.08, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(bp); bp.connect(g); g.connect(this.musicFade);
        src.start(t0);

        // leichter Körper
        const body = this.ctx.createOscillator();
        body.type = 'triangle';
        body.frequency.setValueAtTime(180, t0);
        const bg = this.ctx.createGain();
        bg.gain.setValueAtTime(0.04, t0);
        bg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
        body.connect(bg); bg.connect(this.musicFade);
        body.start(t0); body.stop(t0 + 0.1);
    }

    // Optional: echte Musikdatei statt Generator (z.B. 'assets/music/lofi.mp3')
    async setMusicFile(url) {
        if (!this.ready) return;
        try {
            const res = await fetch(url);
            const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
            this.stopMusic();
            const src = this.ctx.createBufferSource();
            src.buffer = buf;
            src.loop = true;
            src.connect(this.musicGain);
            src.start();
            this._musicFileSource = src;
        } catch (e) {
            console.warn('Musikdatei konnte nicht geladen werden, nutze Generator', e);
            this.startMusic();
        }
    }

    // Optional: Sprachaufnahme für Dialoge
    async playVoice(url) {
        if (!this.ready || !url) return null;
        try {
            const res = await fetch(url);
            const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
            const src = this.ctx.createBufferSource();
            src.buffer = buf;
            src.connect(this.sfxGain);
            src.start();
            return src;
        } catch {
            return null;
        }
    }
}

export const Audio = new AudioManager();
