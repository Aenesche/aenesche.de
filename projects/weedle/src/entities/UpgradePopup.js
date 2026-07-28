// Upgrade-Popup: erscheint bei Q neben einer Station.
// Zeigt ALLE Upgrade-Zweige der Station untereinander (die meisten haben 1,
// Beete haben 2: Speed + Tier). Kaufen per Zahlentaste [1]/[2].
// Q schließt das Popup wieder. Wegbewegen schließt automatisch.

import { UPGRADES, EMPLOYEE } from '../config/constants.js';
import { Audio } from '../audio/AudioManager.js';

export default class UpgradePopup {
    constructor(scene) {
        this.scene = scene;
        this.station = null;
        this.visible = false;

        this.container = scene.add.container(0, 0);
        this.container.setDepth(400000);
        this.container.setVisible(false);

        this.bg = scene.add.graphics();
        this.container.add(this.bg);

        this.titleText = scene.add.text(0, 0, '', {
            font: 'bold 12px monospace',
            color: '#00ffff',
            align: 'center',
        }).setOrigin(0.5, 0);
        this.container.add(this.titleText);

        // Bis zu 2 Options-Zeilen
        this.optionTexts = [];
        for (let i = 0; i < 2; i++) {
            const t = scene.add.text(0, 0, '', {
                font: '11px monospace',
                color: '#00ff88',
                align: 'center',
            }).setOrigin(0.5, 0);
            this.container.add(t);
            this.optionTexts.push(t);
        }

        this.hintText = scene.add.text(0, 0, '', {
            font: '10px monospace',
            color: '#888',
            align: 'center',
        }).setOrigin(0.5, 0);
        this.container.add(this.hintText);

        // Zahlentasten zum Kaufen
        scene.input.keyboard.addKey('ONE').on('down', () => this.buyBranch(0));
        scene.input.keyboard.addKey('TWO').on('down', () => this.buyBranch(1));
    }

    // Liefert alle Upgrade-Zweige einer Station:
    // { config, levelKey } — levelKey ist das Feld auf der Station ('upgradeLevel' oder 'tier')
    getBranches(station) {
        const name = station.constructor.name;
        if (name === 'Bed') {
            return [
                { config: UPGRADES.bed, levelKey: 'upgradeLevel' },
                { config: UPGRADES.bedTier, levelKey: 'tier' },
            ];
        }
        if (name === 'Register') return [{ config: UPGRADES.register, levelKey: 'upgradeLevel' }];
        if (name === 'SeedTerminal') return [{ config: UPGRADES.seedTerminal, levelKey: 'upgradeLevel' }];
        if (name === 'StorageTable') return [{ config: UPGRADES.storage, levelKey: 'upgradeLevel' }];
        if (name === 'TrashCan') return [{ config: UPGRADES.trash, levelKey: 'upgradeLevel' }];
        if (name === 'HiringStation') {
            return [{
                config: {
                    label: 'SPEED',
                    description: (lvl) => {
                        const spd = Math.min(EMPLOYEE.SPEED_BASE + lvl * EMPLOYEE.SPEED_PER_LEVEL, EMPLOYEE.SPEED_MAX);
                        return `${spd} px/s`;
                    },
                    basePrice: 50,
                    priceMultiplier: 2,
                    maxLevel: Math.ceil((EMPLOYEE.SPEED_MAX - EMPLOYEE.SPEED_BASE) / EMPLOYEE.SPEED_PER_LEVEL),
                },
                levelKey: 'upgradeLevel',
            }];
        }
        return [];
    }

    getPrice(config, level) {
        return Math.round(config.basePrice * Math.pow(config.priceMultiplier, level));
    }

    show(station) {
        const branches = this.getBranches(station);
        if (branches.length === 0) return;

        this.station = station;
        this.visible = true;

        // Titel = Stations-Label des ersten Zweigs
        this.titleText.setText(branches[0].config.label);

        // Options-Zeilen
        for (let i = 0; i < this.optionTexts.length; i++) {
            const t = this.optionTexts[i];
            if (i >= branches.length) {
                t.setText('');
                continue;
            }
            const { config, levelKey } = branches[i];
            const level = station[levelKey] || 0;
            const maxed = level >= config.maxLevel;

            if (maxed) {
                t.setText(`[${i + 1}] ${config.label} — MAX`);
                t.setColor('#666');
            } else {
                const price = this.getPrice(config, level);
                t.setText(`[${i + 1}] ${config.label} Lv${level} → ${config.description(level + 1)}  €${price}`);
                t.setColor(this.scene.state.canAfford(price) ? '#00ff88' : '#ff6666');
            }
        }

        this.hintText.setText('[1/2] kaufen  [Q] schließen');

        // Layout: Höhe abhängig von Zweigen
        const lineH = 16;
        const h = 30 + branches.length * lineH + 18;
        // Breite an den tatsächlichen Text anpassen — lange Zeilen wie
        // "[2] BEET TIER Lv2 → Tier 3 — bis Crystal €800" sprengten die feste Breite.
        const textW = Math.max(
            this.titleText.width,
            this.hintText.width,
            ...this.optionTexts.filter(t => t.text).map(t => t.width),
        );
        const w = Math.max(240, Math.ceil(textW) + 32);
        const topY = -h + 10;

        this.titleText.setPosition(0, topY + 6);
        for (let i = 0; i < branches.length; i++) {
            this.optionTexts[i].setPosition(0, topY + 24 + i * lineH);
        }
        this.hintText.setPosition(0, topY + 24 + branches.length * lineH + 4);

        this.bg.clear();
        this.bg.fillStyle(0x000000, 0.85);
        this.bg.fillRoundedRect(-w / 2, topY, w, h, 4);
        this.bg.lineStyle(1, 0x00ffff, 0.6);
        this.bg.strokeRoundedRect(-w / 2, topY, w, h, 4);

        const x = station.isoX;
        const y = (station.bounds?.top ?? station.isoY) - 8;
        this.container.setPosition(x, y);

        this.container.setVisible(true);
    }

    hide() {
        if (!this.visible) return;
        this.visible = false;
        this.station = null;
        this.container.setVisible(false);
    }

    buyBranch(index) {
        if (!this.visible || !this.station) return;
        const branches = this.getBranches(this.station);
        if (index >= branches.length) return;

        const { config, levelKey } = branches[index];
        const level = this.station[levelKey] || 0;
        if (level >= config.maxLevel) return;

        const price = this.getPrice(config, level);
        if (!this.scene.state.spend(price)) return;

        this.station[levelKey] = level + 1;
        Audio.play('upgrade');
        this.scene.goals?.onUpgrade(this.station.constructor.name, this.station[levelKey]);

        // Spezialfall: HiringStation-Speed ist global
        if (this.station.constructor.name === 'HiringStation') {
            this.scene.employeeSpeedLevel = this.station.upgradeLevel;
        }

        if (this.station.onUpgrade) {
            this.station.onUpgrade(this.station.upgradeLevel);
        }

        // Refresh mit neuen Werten
        this.show(this.station);
    }
}
