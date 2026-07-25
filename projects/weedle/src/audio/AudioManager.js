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

// Lofi-Progression: Dm7 → G7 → Cmaj7 → Am7 (ii-V-I-vi)
const CHORDS = [
    [50, 57, 60, 65],  // Dm7
    [43, 59, 62, 65],  // G7
    [48, 55, 59, 64],  // Cmaj7
    [45, 55, 60, 64],  // Am7
];

class AudioManager {
    constructor() {
        this.ctx = null;
        this.ready = false;

        const saved = Storage.load(SETTINGS_KEY);
        this.musicVolume = saved?.musicVolume ?? 0.35;
        this.sfxVolume = saved?.sfxVolume ?? 0.6;

        this.musicPlaying = false;
        this._chordIndex = 0;
        this._musicTimer = null;
        this._musicFileSource = null;
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
        this._scheduleChord();
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this._musicTimer) { clearTimeout(this._musicTimer); this._musicTimer = null; }
    }

    // Ein Akkord: warmes Pad + Bass + etwas Vinyl. Danach der nächste.
    _scheduleChord() {
        if (!this.musicPlaying || !this.ready) return;

        const chord = CHORDS[this._chordIndex % CHORDS.length];
        this._chordIndex++;
        const dur = 4.2;

        // Pad: leicht verstimmte Sinus-Paare, sehr weich
        for (const note of chord) {
            for (const det of [-6, 6]) {
                this.tone({
                    freq: f(note + 12), dur: dur * 0.95, type: 'sine',
                    gain: 0.05, attack: 1.2, detune: det, dest: this.musicGain,
                });
            }
        }

        // Bass: Grundton, tief und rund
        this.tone({
            freq: f(chord[0] - 12), dur: dur * 0.7, type: 'sine',
            gain: 0.12, attack: 0.15, dest: this.musicGain,
        });

        // Vinyl-Knistern
        for (let i = 0; i < 3; i++) {
            this.noise({
                dur: 0.04, gain: 0.02, filterFreq: 1600,
                delay: Math.random() * dur, dest: this.musicGain,
            });
        }

        this._musicTimer = setTimeout(() => this._scheduleChord(), dur * 1000);
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
