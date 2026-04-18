// Upgrade-Popup: erscheint über der Station wenn Q gedrückt wird.
// Zeigt Level, Effekt, Preis. Nochmal Q oder E zum Kaufen, Wegbewegen schließt.

import { UPGRADES, EMPLOYEE } from '../config/constants.js';

export default class UpgradePopup {
    constructor(scene) {
        this.scene = scene;
        this.station = null;
        this.visible = false;

        // Container für alle Popup-Elemente
        this.container = scene.add.container(0, 0);
        this.container.setDepth(400000);
        this.container.setVisible(false);

        // Hintergrund
        this.bg = scene.add.graphics();
        this.container.add(this.bg);

        // Texte
        this.titleText = scene.add.text(0, -38, '', {
            font: 'bold 12px monospace',
            color: '#00ffff',
            align: 'center',
        }).setOrigin(0.5, 0);
        this.container.add(this.titleText);

        this.levelText = scene.add.text(0, -24, '', {
            font: '11px monospace',
            color: '#ffffff',
            align: 'center',
        }).setOrigin(0.5, 0);
        this.container.add(this.levelText);

        this.effectText = scene.add.text(0, -12, '', {
            font: '11px monospace',
            color: '#00ff88',
            align: 'center',
        }).setOrigin(0.5, 0);
        this.container.add(this.effectText);

        this.priceText = scene.add.text(0, 2, '', {
            font: 'bold 12px monospace',
            color: '#ffff00',
            align: 'center',
        }).setOrigin(0.5, 0);
        this.container.add(this.priceText);

        this.hintText = scene.add.text(0, 16, '[Q] kaufen', {
            font: '10px monospace',
            color: '#888',
            align: 'center',
        }).setOrigin(0.5, 0);
        this.container.add(this.hintText);
    }

    show(station) {
        const config = this.getUpgradeConfig(station);
        if (!config) return;

        this.station = station;
        this.visible = true;

        const level = station.upgradeLevel || 0;
        const price = this.getPrice(config, level);
        const maxed = level >= config.maxLevel;

        this.titleText.setText(config.label);
        this.levelText.setText(`Level ${level}`);
        this.effectText.setText(maxed ? 'MAX' : config.description(level + 1));
        this.priceText.setText(maxed ? '' : `€${price}`);
        this.hintText.setText(maxed ? '' : '[Q] kaufen');

        // Position über der Station
        const x = station.isoX;
        const y = (station.bounds?.top ?? station.isoY) - 50;
        this.container.setPosition(x, y);

        // Hintergrund zeichnen
        this.bg.clear();
        const w = 120, h = 65;
        this.bg.fillStyle(0x000000, 0.85);
        this.bg.fillRoundedRect(-w / 2, -42, w, h, 4);
        this.bg.lineStyle(1, 0x00ffff, 0.6);
        this.bg.strokeRoundedRect(-w / 2, -42, w, h, 4);

        this.container.setVisible(true);
    }

    hide() {
        if (!this.visible) return;
        this.visible = false;
        this.station = null;
        this.container.setVisible(false);
    }

    tryPurchase(gameState) {
        if (!this.station || !this.visible) return false;
        const config = this.getUpgradeConfig(this.station);
        if (!config) return false;

        const level = this.station.upgradeLevel || 0;
        if (level >= config.maxLevel) return false;

        const price = this.getPrice(config, level);
        if (!gameState.spend(price)) return false;

        this.station.upgradeLevel = (this.station.upgradeLevel || 0) + 1;

        // Spezialfall: HiringStation-Upgrade = globaler Employee-Speed
        if (this.station.constructor.name === 'HiringStation') {
            this.scene.employeeSpeedLevel = this.station.upgradeLevel;
        }

        if (this.station.onUpgrade) {
            this.station.onUpgrade(this.station.upgradeLevel);
        }
        // Popup refreshen mit neuem Level
        this.show(this.station);
        return true;
    }

    getUpgradeConfig(station) {
        const name = station.constructor.name;
        if (name === 'Bed') return UPGRADES.bed;
        if (name === 'Register') return UPGRADES.register;
        if (name === 'SeedTerminal') return UPGRADES.seedTerminal;
        if (name === 'StorageTable') return UPGRADES.storage;
        if (name === 'TrashCan') return UPGRADES.trash;
        if (name === 'HiringStation') return {
            label: 'SPEED',
            description: (lvl) => {
                const spd = Math.min(EMPLOYEE.SPEED_BASE + lvl * EMPLOYEE.SPEED_PER_LEVEL, EMPLOYEE.SPEED_MAX);
                return `${spd} px/s`;
            },
            basePrice: 50,
            priceMultiplier: 2,
            effect: (lvl) => Math.min(EMPLOYEE.SPEED_BASE + lvl * EMPLOYEE.SPEED_PER_LEVEL, EMPLOYEE.SPEED_MAX),
            maxLevel: Math.ceil((EMPLOYEE.SPEED_MAX - EMPLOYEE.SPEED_BASE) / EMPLOYEE.SPEED_PER_LEVEL),
        };
        return null;
    }

    getPrice(config, level) {
        return Math.round(config.basePrice * Math.pow(config.priceMultiplier, level));
    }
}
