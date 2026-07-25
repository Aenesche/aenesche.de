// Startseite: Spielmodi-Auswahl + Login-Gate + Update-Teaser.
// Ohne Login geht nichts — Button führt zur globalen Login-Seite.

import { GAME } from '../config/constants.js';
import { getUser, LOGIN_URL } from '../net/supabase.js';
import { Audio } from '../audio/AudioManager.js';
import SettingsPanel from '../ui/SettingsPanel.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('Menu');
    }

    create() {
        const cx = GAME.WIDTH / 2;

        // Audio erst nach User-Geste (Browser-Vorgabe)
        const unlockAudio = () => { Audio.unlock(); Audio.startMusic(); };
        this.input.once('pointerdown', unlockAudio);
        this.input.keyboard.once('keydown', unlockAudio);

        this.settings = new SettingsPanel(this);

        // Titel
        this.add.text(cx, 110, 'WEEDLE', {
            font: 'bold 64px monospace',
            color: '#00ff88',
        }).setOrigin(0.5);
        this.add.text(cx, 165, 'Neon Grow Tycoon', {
            font: '16px monospace',
            color: '#00ffff',
        }).setOrigin(0.5).setAlpha(0.7);

        // Lade-Hinweis bis Session geprüft ist
        this.statusText = this.add.text(cx, 360, 'Prüfe Login…', {
            font: '14px monospace',
            color: '#888',
        }).setOrigin(0.5);

        getUser().then(user => {
            this.statusText.destroy();
            if (user) {
                this.buildMenu(user);
            } else {
                this.buildLoginGate();
            }
        }).catch(() => {
            this.statusText.setText('Verbindungsfehler — Seite neu laden');
        });
    }

    buildMenu(user) {
        const cx = GAME.WIDTH / 2;

        this.add.text(GAME.WIDTH - 20, 16, user.email || 'eingeloggt', {
            font: '12px monospace', color: '#00ff88',
        }).setOrigin(1, 0).setAlpha(0.7);

        this.makeButton(cx, 300, 'LEVEL', 0x00ff88, () => {
            this.scene.start('LevelSelect', { user });
        });

        // Sandbox: gesperrt, kommt später
        const sandbox = this.makeButton(cx, 380, 'SANDBOX', 0x888888, null);
        sandbox.btnText.setAlpha(0.4);
        this.add.text(cx, 410, 'Bald verfügbar — Stationen schaltest du in den Leveln frei', {
            font: '11px monospace', color: '#666',
        }).setOrigin(0.5);

        this.makeButton(cx, 452, 'EINSTELLUNGEN', 0x00ffff, () => {
            Audio.play('uiClick');
            this.settings.show();
        });

        // Update-Teaser
        const teaser = this.add.text(cx, 600,
            '⚡ GROSSES UPDATE IN ARBEIT ⚡\nLampen · Lüftung · Polizei-Razzien · Neue Welten',
            {
                font: '13px monospace',
                color: '#ff00ff',
                align: 'center',
            }).setOrigin(0.5).setAlpha(0.8);
        this.tweens.add({
            targets: teaser, alpha: 0.4, duration: 1200, yoyo: true, repeat: -1,
        });
    }

    buildLoginGate() {
        const cx = GAME.WIDTH / 2;

        this.add.text(cx, 300, 'Login erforderlich', {
            font: 'bold 20px monospace', color: '#ff6666',
        }).setOrigin(0.5);
        this.add.text(cx, 335, 'Dein Fortschritt wird mit deinem Account gespeichert.', {
            font: '13px monospace', color: '#aaa',
        }).setOrigin(0.5);

        this.makeButton(cx, 400, 'ZUM LOGIN', 0x00ffff, () => {
            // Zurück-Redirect auf das Spiel nach Login
            window.location.href = LOGIN_URL;
        });
    }

    makeButton(x, y, label, color, onClick) {
        const hex = '#' + color.toString(16).padStart(6, '0');
        const btnText = this.add.text(x, y, `[ ${label} ]`, {
            font: 'bold 24px monospace',
            color: hex,
        }).setOrigin(0.5);

        if (onClick) {
            btnText.setInteractive({ useHandCursor: true });
            btnText.on('pointerover', () => btnText.setScale(1.1));
            btnText.on('pointerout', () => btnText.setScale(1));
            btnText.on('pointerdown', () => { Audio.play('uiClick'); onClick(); });
        }
        return { btnText };
    }
}
