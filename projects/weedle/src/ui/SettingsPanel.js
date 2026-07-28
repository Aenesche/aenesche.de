// Einstellungen-Overlay. Wird von MenuScene und GameScene benutzt.
// Lautstärke als anklickbare Segment-Leisten (passt zum Wireframe-Look
// und funktioniert auf Touch besser als ein Drag-Slider).
// Dazu die Touch-Steuerung: an/aus, Deckkraft, Joystick-Seite.

import { GAME } from '../config/constants.js';
import { Audio } from '../audio/AudioManager.js';
import { UiSettings } from '../config/uiSettings.js';

const SEGMENTS = 10;
const BAR_W = 260;
const BAR_H = 20;

export default class SettingsPanel {
    constructor(scene, onClose = null) {
        this.scene = scene;
        this.onClose = onClose;
        this.visible = false;
        this.rows = [];

        this.container = scene.add.container(0, 0).setDepth(900000);
        this.container.setVisible(false);

        const cx = GAME.WIDTH / 2;
        const cy = GAME.HEIGHT / 2;
        const w = 440, h = 492;
        this.top = cy - h / 2;

        const dim = scene.add.graphics();
        dim.fillStyle(0x000000, 0.8);
        dim.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
        dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT),
                           Phaser.Geom.Rectangle.Contains);
        this.container.add(dim);

        const box = scene.add.graphics();
        box.fillStyle(0x060d0c, 0.98);
        box.fillRoundedRect(cx - w / 2, this.top, w, h, 8);
        box.lineStyle(2, 0x00ffff, 0.7);
        box.strokeRoundedRect(cx - w / 2, this.top, w, h, 8);
        this.container.add(box);

        this.container.add(scene.add.text(cx, this.top + 18, 'EINSTELLUNGEN', {
            font: 'bold 18px monospace', color: '#00ffff',
        }).setOrigin(0.5, 0));

        let y = this.top + 62;

        this.musicBar = this.makeBar(cx, y, 'MUSIK', () => Audio.musicVolume,
            v => { Audio.setMusicVolume(v); Audio.play('uiClick'); });
        y += 62;

        this.sfxBar = this.makeBar(cx, y, 'EFFEKTE', () => Audio.sfxVolume,
            v => { Audio.setSfxVolume(v); Audio.play('uiClick'); });
        y += 70;

        // Trennlinie
        const sep = scene.add.graphics();
        sep.lineStyle(1, 0x00ffff, 0.25);
        sep.beginPath();
        sep.moveTo(cx - BAR_W / 2, y - 22);
        sep.lineTo(cx + BAR_W / 2, y - 22);
        sep.strokePath();
        this.container.add(sep);

        this.touchToggle = this.makeToggle(cx, y, 'TOUCH-STEUERUNG', ['AUS', 'AN'],
            () => (UiSettings.mobileControls ? 1 : 0),
            i => { UiSettings.set('mobileControls', i === 1); Audio.play('uiClick'); this.refresh(); });
        y += 58;

        this.opacityBar = this.makeBar(cx, y, 'DECKKRAFT OVERLAY', () => UiSettings.opacity,
            v => { UiSettings.set('opacity', Math.max(0.15, v)); Audio.play('uiClick'); });
        y += 62;

        this.sideToggle = this.makeToggle(cx, y, 'JOYSTICK-SEITE', ['LINKS', 'RECHTS'],
            () => (UiSettings.joystickSide === 'right' ? 1 : 0),
            i => { UiSettings.set('joystickSide', i === 1 ? 'right' : 'left'); Audio.play('uiClick'); this.refresh(); });
        y += 58;

        // Vollbild: auf dem Handy gewinnt man dadurch die Browserleisten dazu.
        // iOS Safari kennt die Fullscreen-API nicht — dort bleibt die Zeile grau.
        this.fullscreenToggle = this.makeToggle(cx, y, 'VOLLBILD', ['AUS', 'AN'],
            () => (scene.scale.isFullscreen ? 1 : 0),
            i => {
                if (!scene.scale.fullscreen?.available) return;
                if (i === 1 && !scene.scale.isFullscreen) scene.scale.startFullscreen();
                if (i === 0 && scene.scale.isFullscreen) scene.scale.stopFullscreen();
                Audio.play('uiClick');
                this.refresh();
            });

        if (!scene.scale.fullscreen?.available) {
            this.container.add(scene.add.text(cx + BAR_W / 2, y - 22, 'nicht verfügbar', {
                font: '10px monospace', color: '#556',
            }).setOrigin(1, 0));
        }

        const close = scene.add.text(cx, this.top + h - 30, '[ SCHLIESSEN ]', {
            font: 'bold 15px monospace', color: '#00ff88',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        close.on('pointerover', () => close.setScale(1.08));
        close.on('pointerout', () => close.setScale(1));
        close.on('pointerdown', () => { Audio.play('uiClick'); this.hide(); });
        this.container.add(close);

        this.escKey = scene.input.keyboard.addKey('ESC');
    }

    // Segment-Leiste 0..1
    makeBar(cx, y, label, getValue, setValue) {
        const scene = this.scene;
        const left = cx - BAR_W / 2;

        this.container.add(scene.add.text(left, y - 22, label, {
            font: '12px monospace', color: '#7fd8c8',
        }));

        const valueText = scene.add.text(cx + BAR_W / 2, y - 22, '', {
            font: '12px monospace', color: '#00ff88',
        }).setOrigin(1, 0);
        this.container.add(valueText);

        const gfx = scene.add.graphics();
        this.container.add(gfx);

        const redraw = () => {
            const v = getValue();
            const filled = Math.round(v * SEGMENTS);
            gfx.clear();
            const segW = BAR_W / SEGMENTS;
            for (let i = 0; i < SEGMENTS; i++) {
                const x = left + i * segW;
                if (i < filled) {
                    gfx.fillStyle(0x00ff88, 0.75);
                    gfx.fillRect(x + 2, y, segW - 4, BAR_H);
                }
                gfx.lineStyle(1, 0x00ffff, 0.5);
                gfx.strokeRect(x + 2, y, segW - 4, BAR_H);
            }
            valueText.setText(`${Math.round(v * 100)}%`);
        };
        redraw();

        const zone = scene.add.zone(cx, y + BAR_H / 2, BAR_W, BAR_H + 16)
            .setInteractive({ useHandCursor: true });
        zone.on('pointerdown', (p) => {
            const rel = Phaser.Math.Clamp((p.x - left) / BAR_W, 0, 1);
            setValue(Math.round(rel * SEGMENTS) / SEGMENTS);
            redraw();
        });
        this.container.add(zone);

        const row = { redraw };
        this.rows.push(row);
        return row;
    }

    // Zwei-Wege-Umschalter
    makeToggle(cx, y, label, options, getIndex, setIndex) {
        const scene = this.scene;
        const left = cx - BAR_W / 2;

        this.container.add(scene.add.text(left, y - 22, label, {
            font: '12px monospace', color: '#7fd8c8',
        }));

        const optW = BAR_W / options.length;
        const gfx = scene.add.graphics();
        this.container.add(gfx);

        const texts = options.map((opt, i) => {
            const t = scene.add.text(left + optW * (i + 0.5), y + BAR_H / 2, opt, {
                font: 'bold 12px monospace', color: '#888',
            }).setOrigin(0.5);
            this.container.add(t);

            const zone = scene.add.zone(left + optW * (i + 0.5), y + BAR_H / 2, optW - 6, BAR_H + 10)
                .setInteractive({ useHandCursor: true });
            zone.on('pointerdown', () => setIndex(i));
            this.container.add(zone);
            return t;
        });

        const redraw = () => {
            const active = getIndex();
            gfx.clear();
            options.forEach((_, i) => {
                const x = left + optW * i;
                if (i === active) {
                    gfx.fillStyle(0x00ff88, 0.28);
                    gfx.fillRect(x + 3, y, optW - 6, BAR_H);
                }
                gfx.lineStyle(1, 0x00ffff, i === active ? 0.9 : 0.35);
                gfx.strokeRect(x + 3, y, optW - 6, BAR_H);
                texts[i].setColor(i === active ? '#00ff88' : '#667');
            });
        };
        redraw();

        const row = { redraw };
        this.rows.push(row);
        return row;
    }

    refresh() {
        this.rows.forEach(r => r.redraw());
    }

    show() {
        this.visible = true;
        this.refresh();
        this.container.setVisible(true);
    }

    hide() {
        this.visible = false;
        this.container.setVisible(false);
        this.onClose?.();
    }

    toggle() { this.visible ? this.hide() : this.show(); }
}
