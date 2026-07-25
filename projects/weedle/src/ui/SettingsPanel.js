// Einstellungen-Overlay. Wird von MenuScene und GameScene benutzt.
// Lautstärke als anklickbare Segment-Leisten (passt zum Wireframe-Look
// und funktioniert auch auf Touch besser als ein Drag-Slider).

import { GAME } from '../config/constants.js';
import { Audio } from '../audio/AudioManager.js';

const SEGMENTS = 10;
const BAR_W = 260;
const BAR_H = 22;

export default class SettingsPanel {
    constructor(scene, onClose = null) {
        this.scene = scene;
        this.onClose = onClose;
        this.visible = false;

        this.container = scene.add.container(0, 0).setDepth(700000);
        this.container.setVisible(false);

        const cx = GAME.WIDTH / 2;
        const cy = GAME.HEIGHT / 2;
        const w = 420, h = 260;

        const dim = scene.add.graphics();
        dim.fillStyle(0x000000, 0.75);
        dim.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
        dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT),
                           Phaser.Geom.Rectangle.Contains);
        this.container.add(dim);

        const box = scene.add.graphics();
        box.fillStyle(0x060d0c, 0.97);
        box.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 8);
        box.lineStyle(2, 0x00ffff, 0.7);
        box.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 8);
        this.container.add(box);

        this.container.add(scene.add.text(cx, cy - h / 2 + 22, 'EINSTELLUNGEN', {
            font: 'bold 18px monospace', color: '#00ffff',
        }).setOrigin(0.5, 0));

        this.musicBar = this.makeBar(cx, cy - 40, 'MUSIK', () => Audio.musicVolume,
            v => { Audio.setMusicVolume(v); Audio.play('uiClick'); });
        this.sfxBar = this.makeBar(cx, cy + 30, 'EFFEKTE', () => Audio.sfxVolume,
            v => { Audio.setSfxVolume(v); Audio.play('uiClick'); });

        const close = scene.add.text(cx, cy + h / 2 - 34, '[ SCHLIESSEN ]', {
            font: 'bold 15px monospace', color: '#00ff88',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        close.on('pointerover', () => close.setScale(1.08));
        close.on('pointerout', () => close.setScale(1));
        close.on('pointerdown', () => { Audio.play('uiClick'); this.hide(); });
        this.container.add(close);

        this.escKey = scene.input.keyboard.addKey('ESC');
    }

    makeBar(cx, y, label, getValue, setValue) {
        const scene = this.scene;
        const left = cx - BAR_W / 2;

        this.container.add(scene.add.text(left, y - 24, label, {
            font: '12px monospace', color: '#7fd8c8',
        }));

        const valueText = scene.add.text(cx + BAR_W / 2, y - 24, '', {
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

        const zone = scene.add.zone(cx, y + BAR_H / 2, BAR_W, BAR_H + 14)
            .setInteractive({ useHandCursor: true });
        zone.on('pointerdown', (p) => {
            const rel = Phaser.Math.Clamp((p.x - left) / BAR_W, 0, 1);
            // Auf Segmentgrenze runden, min 0
            setValue(Math.round(rel * SEGMENTS) / SEGMENTS);
            redraw();
        });
        this.container.add(zone);

        return { redraw };
    }

    show() {
        this.visible = true;
        this.musicBar.redraw();
        this.sfxBar.redraw();
        this.container.setVisible(true);
    }

    hide() {
        this.visible = false;
        this.container.setVisible(false);
        this.onClose?.();
    }

    toggle() {
        this.visible ? this.hide() : this.show();
    }
}
