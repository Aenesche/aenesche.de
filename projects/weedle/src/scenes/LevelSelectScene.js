// Level-Auswahl: 10 Kacheln mit Sternen. Level N ist freigeschaltet wenn
// Level N-1 abgeschlossen ist (Level 1 immer offen).
// Aktiver Spielstand → "Fortsetzen"-Banner. Anderes Level starten während
// eins aktiv ist → Warn-Dialog (alter Stand wird verworfen).

import { GAME } from '../config/constants.js';
import { LEVELS, getLevel } from '../config/levels.js';
import { fetchProgress, fetchActiveSave, addUnlocks } from '../net/supabase.js';
import { SaveManager } from '../storage/SaveManager.js';
import { Audio } from '../audio/AudioManager.js';

export default class LevelSelectScene extends Phaser.Scene {
    constructor() {
        super('LevelSelect');
    }

    init(data) {
        this.user = data.user;
    }

    create() {
        const cx = GAME.WIDTH / 2;

        this.add.text(cx, 50, 'LEVEL', {
            font: 'bold 32px monospace', color: '#00ff88',
        }).setOrigin(0.5);

        this.add.text(60, 50, '← Menü', {
            font: '14px monospace', color: '#00ffff',
        }).setOrigin(0, 0.5)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.scene.start('Menu'));

        this.loading = this.add.text(cx, 300, 'Lade Fortschritt…', {
            font: '14px monospace', color: '#888',
        }).setOrigin(0.5);

        // Fortschritt + aktiven Save parallel laden.
        // Lokaler Save hat Vorrang (aktueller), Supabase ist Fallback (anderes Gerät).
        Promise.all([fetchProgress(), fetchActiveSave()]).then(([progress, remoteSave]) => {
            this.loading.destroy();
            this.progress = new Map(progress.map(p => [p.level_id, p]));
            const localSave = SaveManager.loadLocal();
            this.activeSave = localSave || (remoteSave ? remoteSave.save_data : null);
            this.buildGrid();
        }).catch(() => {
            this.loading.setText('Fehler beim Laden — neu versuchen');
        });
    }

    isUnlocked(levelId) {
        if (levelId === 1) return true;
        return this.progress.has(levelId - 1);
    }

    buildGrid() {
        const cols = 5;
        const tileW = 180, tileH = 130;
        const startX = (GAME.WIDTH - cols * tileW) / 2 + tileW / 2;
        const startY = 170;

        for (const level of LEVELS) {
            const i = level.id - 1;
            const x = startX + (i % cols) * tileW;
            const y = startY + Math.floor(i / cols) * (tileH + 30);
            this.buildTile(level, x, y, tileW - 20, tileH);
        }

        // Fortsetzen-Banner
        if (this.activeSave) {
            const level = getLevel(this.activeSave.levelId);
            if (level) {
                const cy = 520;
                const banner = this.add.text(GAME.WIDTH / 2, cy,
                    `▶ Level ${level.id} „${level.name}" fortsetzen`, {
                    font: 'bold 18px monospace',
                    color: '#ffff00',
                    backgroundColor: '#222200',
                    padding: { x: 16, y: 8 },
                }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                banner.on('pointerdown', () => this.startLevel(level, this.activeSave));
            }
        }
    }

    buildTile(level, x, y, w, h) {
        const unlocked = this.isUnlocked(level.id);
        const prog = this.progress.get(level.id);
        const stars = prog ? prog.stars : 0;
        const isActive = this.activeSave?.levelId === level.id;

        const g = this.add.graphics();
        const color = unlocked ? (isActive ? 0xffff00 : 0x00ffff) : 0x333333;
        g.fillStyle(0x000000, 0.6);
        g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
        g.lineStyle(2, color, unlocked ? 0.9 : 0.4);
        g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);

        this.add.text(x, y - h / 2 + 18, `${level.id}`, {
            font: 'bold 26px monospace',
            color: unlocked ? '#00ff88' : '#555',
        }).setOrigin(0.5);

        this.add.text(x, y - 4, level.name, {
            font: '12px monospace',
            color: unlocked ? '#fff' : '#555',
            align: 'center',
            wordWrap: { width: w - 16 },
        }).setOrigin(0.5);

        // Sterne
        const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        this.add.text(x, y + h / 2 - 20, starStr, {
            font: '18px monospace',
            color: stars > 0 ? '#ffff00' : '#444',
        }).setOrigin(0.5);

        if (!unlocked) {
            this.add.text(x, y + h / 2 - 42, '🔒', { font: '14px monospace' }).setOrigin(0.5);
            return;
        }

        const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => { Audio.play('uiClick'); this.onTileClick(level); });
    }

    onTileClick(level) {
        // Aktiver Save auf ANDEREM Level → Warn-Dialog
        if (this.activeSave && this.activeSave.levelId !== level.id) {
            this.showDiscardDialog(level);
            return;
        }
        // Gleiche Level-Kachel mit aktivem Save → fortsetzen
        if (this.activeSave && this.activeSave.levelId === level.id) {
            this.startLevel(level, this.activeSave);
            return;
        }
        this.startLevel(level, null);
    }

    showDiscardDialog(level) {
        const cx = GAME.WIDTH / 2, cy = GAME.HEIGHT / 2;
        const overlay = this.add.container(0, 0).setDepth(1000);

        const dim = this.add.graphics();
        dim.fillStyle(0x000000, 0.75);
        dim.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
        overlay.add(dim);

        const box = this.add.graphics();
        box.fillStyle(0x111111, 1);
        box.fillRoundedRect(cx - 230, cy - 90, 460, 180, 8);
        box.lineStyle(2, 0xff6666, 1);
        box.strokeRoundedRect(cx - 230, cy - 90, 460, 180, 8);
        overlay.add(box);

        overlay.add(this.add.text(cx, cy - 55, 'Aktiven Spielstand verwerfen?', {
            font: 'bold 16px monospace', color: '#ff6666',
        }).setOrigin(0.5));
        overlay.add(this.add.text(cx, cy - 22,
            `Dein angefangenes Level ${this.activeSave.levelId} geht verloren,\nwenn du Level ${level.id} startest.`, {
            font: '12px monospace', color: '#aaa', align: 'center',
        }).setOrigin(0.5));

        const yes = this.add.text(cx - 90, cy + 40, '[ Verwerfen ]', {
            font: 'bold 14px monospace', color: '#ff6666',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        yes.on('pointerdown', () => {
            SaveManager.clear(this.user?.id);
            this.activeSave = null;
            overlay.destroy();
            this.startLevel(level, null);
        });
        overlay.add(yes);

        const no = this.add.text(cx + 90, cy + 40, '[ Abbrechen ]', {
            font: 'bold 14px monospace', color: '#00ffff',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        no.on('pointerdown', () => overlay.destroy());
        overlay.add(no);
    }

    startLevel(level, saveData) {
        this.scene.start('Game', { levelConfig: level, saveData, user: this.user });
    }
}
