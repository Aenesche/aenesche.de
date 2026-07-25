// Dialogbox unten links: Gradient-Panel, Charakter-Portrait und
// Schreibmaschinen-Text. Weiter mit Klick / Leertaste / E.
//
// Der Sprecher (Tío Nando) behält die Würfel-Grundform der Spielfiguren,
// hat aber mehr Details — er wird ja deutlich größer dargestellt:
// Panama-Hut, Sonnenbrille, Schnurrbart, Goldkette.

import { GAME } from '../config/constants.js';
import { SPEAKER } from '../config/dialogues.js';
import { Audio } from '../audio/AudioManager.js';

const PANEL_H = 150;
const PANEL_MARGIN = 24;
const PORTRAIT_SIZE = 110;
const CHAR_MS = 28; // Tempo der Schreibmaschine

export default class DialogueBox {
    constructor(scene) {
        this.scene = scene;
        this.lines = [];
        this.index = 0;
        this.onDone = null;
        this.active = false;

        this.container = scene.add.container(0, 0).setDepth(600000);
        this.container.setVisible(false);

        const panelW = Math.min(760, GAME.WIDTH - PANEL_MARGIN * 2);
        const x = PANEL_MARGIN;
        const y = GAME.HEIGHT - PANEL_H - PANEL_MARGIN;
        this.panelW = panelW;

        // Gradient-Hintergrund: mehrere Streifen mit fallender Deckkraft
        const bg = scene.add.graphics();
        const steps = 26;
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            const alpha = 0.9 - t * 0.45;
            const col = Phaser.Display.Color.Interpolate.ColorWithColor(
                new Phaser.Display.Color(4, 12, 10),
                new Phaser.Display.Color(10, 26, 34),
                steps - 1, i
            );
            bg.fillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), alpha);
            bg.fillRect(x, y + (PANEL_H / steps) * i, panelW, PANEL_H / steps + 1);
        }
        // Rahmen + Akzentlinie oben
        bg.lineStyle(2, 0x00ffff, 0.5);
        bg.strokeRoundedRect(x, y, panelW, PANEL_H, 6);
        bg.lineStyle(2, SPEAKER.color, 0.9);
        bg.beginPath();
        bg.moveTo(x + 10, y);
        bg.lineTo(x + 190, y);
        bg.strokePath();
        this.container.add(bg);

        // Portrait
        this.portrait = scene.add.graphics();
        this.portrait.setPosition(x + 24 + PORTRAIT_SIZE / 2, y + PANEL_H / 2 + 6);
        this.container.add(this.portrait);
        this.drawPortrait();

        const textX = x + PORTRAIT_SIZE + 48;

        this.nameText = scene.add.text(textX, y + 16, SPEAKER.name, {
            font: 'bold 14px monospace',
            color: '#' + SPEAKER.color.toString(16).padStart(6, '0'),
        });
        this.container.add(this.nameText);

        this.bodyText = scene.add.text(textX, y + 42, '', {
            font: '15px monospace',
            color: '#e8fff8',
            wordWrap: { width: panelW - PORTRAIT_SIZE - 80 },
            lineSpacing: 6,
        });
        this.container.add(this.bodyText);

        this.hint = scene.add.text(x + panelW - 16, y + PANEL_H - 22, '[LEERTASTE] weiter', {
            font: '11px monospace',
            color: '#5a8a80',
        }).setOrigin(1, 0);
        this.container.add(this.hint);

        // Eingaben
        this.keySpace = scene.input.keyboard.addKey('SPACE');
        this.keyE = scene.input.keyboard.addKey('E');
        this.keySpace.on('down', () => this.advance());
        this.keyE.on('down', () => this.advance());
        scene.input.on('pointerdown', () => { if (this.active) this.advance(); });
    }

    // Tío Nando im Wireframe-Stil
    drawPortrait() {
        const g = this.portrait;
        const s = PORTRAIT_SIZE / 2;
        const col = SPEAKER.color;
        g.clear();

        // Kopf-Würfel
        g.fillStyle(col, 0.12);
        g.fillRect(-s * 0.72, -s * 0.62, s * 1.44, s * 1.3);
        g.lineStyle(2.5, col, 1);
        g.strokeRect(-s * 0.72, -s * 0.62, s * 1.44, s * 1.3);

        // Panama-Hut: Krempe + Kopfteil + Band
        g.lineStyle(2.5, col, 1);
        g.fillStyle(col, 0.2);
        g.fillEllipse(0, -s * 0.66, s * 2.0, s * 0.34);
        g.strokeEllipse(0, -s * 0.66, s * 2.0, s * 0.34);
        g.fillStyle(col, 0.18);
        g.fillRect(-s * 0.5, -s * 1.06, s * 1.0, s * 0.42);
        g.strokeRect(-s * 0.5, -s * 1.06, s * 1.0, s * 0.42);
        g.lineStyle(3, 0x000000, 0.55);
        g.beginPath();
        g.moveTo(-s * 0.5, -s * 0.76);
        g.lineTo(s * 0.5, -s * 0.76);
        g.strokePath();

        // Sonnenbrille: zwei Gläser + Steg
        g.fillStyle(0x001a18, 0.95);
        g.fillRect(-s * 0.56, -s * 0.3, s * 0.44, s * 0.28);
        g.fillRect(s * 0.12, -s * 0.3, s * 0.44, s * 0.28);
        g.lineStyle(2, col, 1);
        g.strokeRect(-s * 0.56, -s * 0.3, s * 0.44, s * 0.28);
        g.strokeRect(s * 0.12, -s * 0.3, s * 0.44, s * 0.28);
        g.beginPath();
        g.moveTo(-s * 0.12, -s * 0.18);
        g.lineTo(s * 0.12, -s * 0.18);
        g.strokePath();
        // Glanzpunkte
        g.fillStyle(0x9ffff0, 0.75);
        g.fillRect(-s * 0.5, -s * 0.26, s * 0.1, s * 0.06);
        g.fillRect(s * 0.18, -s * 0.26, s * 0.1, s * 0.06);

        // Schnurrbart
        g.fillStyle(col, 0.85);
        g.beginPath();
        g.moveTo(-s * 0.42, s * 0.16);
        g.lineTo(-s * 0.1, s * 0.06);
        g.lineTo(s * 0.1, s * 0.06);
        g.lineTo(s * 0.42, s * 0.16);
        g.lineTo(s * 0.3, s * 0.32);
        g.lineTo(0, s * 0.2);
        g.lineTo(-s * 0.3, s * 0.32);
        g.closePath();
        g.fillPath();

        // Goldkette
        g.lineStyle(2, 0xffd24a, 0.9);
        g.beginPath();
        g.moveTo(-s * 0.4, s * 0.68);
        g.lineTo(0, s * 0.86);
        g.lineTo(s * 0.4, s * 0.68);
        g.strokePath();
        g.fillStyle(0xffd24a, 0.9);
        g.fillCircle(0, s * 0.9, s * 0.07);
    }

    // lines: [{ text, voice? }]
    show(lines, onDone) {
        if (!lines || lines.length === 0) { onDone?.(); return; }
        this.lines = lines;
        this.index = 0;
        this.onDone = onDone;
        this.active = true;
        this.container.setVisible(true);
        this.renderLine();
    }

    renderLine() {
        const line = this.lines[this.index];
        this.full = line.text;
        this.shown = 0;
        this.bodyText.setText('');
        this.typing = true;
        this.hint.setText('[LEERTASTE] überspringen');

        if (this._typeTimer) this._typeTimer.remove();
        this._typeTimer = this.scene.time.addEvent({
            delay: CHAR_MS,
            repeat: this.full.length - 1,
            callback: () => {
                this.shown++;
                this.bodyText.setText(this.full.slice(0, this.shown));
                // Blip nur auf sichtbaren Zeichen, nicht auf jedem
                const ch = this.full[this.shown - 1];
                if (ch && ch !== ' ' && this.shown % 2 === 0) Audio.play('blip');
                if (this.shown >= this.full.length) this.finishTyping();
            },
        });

        // Optionale Sprachaufnahme
        if (line.voice) {
            if (this._voice) { try { this._voice.stop(); } catch {} }
            Audio.playVoice(line.voice).then(src => { this._voice = src; });
        }
    }

    finishTyping() {
        this.typing = false;
        if (this._typeTimer) { this._typeTimer.remove(); this._typeTimer = null; }
        this.bodyText.setText(this.full);
        const last = this.index >= this.lines.length - 1;
        this.hint.setText(last ? '[LEERTASTE] los geht\'s' : '[LEERTASTE] weiter');
    }

    advance() {
        if (!this.active) return;

        // Läuft die Schreibmaschine noch? Erst mal komplett anzeigen.
        if (this.typing) { this.finishTyping(); return; }

        this.index++;
        if (this.index >= this.lines.length) { this.hide(); return; }
        this.renderLine();
    }

    hide() {
        this.active = false;
        this.container.setVisible(false);
        if (this._typeTimer) { this._typeTimer.remove(); this._typeTimer = null; }
        if (this._voice) { try { this._voice.stop(); } catch {} this._voice = null; }
        const cb = this.onDone;
        this.onDone = null;
        cb?.();
    }
}
