// Hiring-Popup: zeigt zwei Optionen (Gärtner / Kassierer) mit Preisen.
// 1 oder 2 drücken zum Kaufen.

import { EMPLOYEE } from '../config/constants.js';

export default class HiringPopup {
    constructor(scene) {
        this.scene = scene;
        this.visible = false;

        this.container = scene.add.container(0, 0);
        this.container.setDepth(400000);
        this.container.setVisible(false);

        this.bg = scene.add.graphics();
        this.container.add(this.bg);

        this.titleText = scene.add.text(0, -55, 'EINSTELLEN', {
            font: 'bold 12px monospace', color: '#0088ff', align: 'center',
        }).setOrigin(0.5, 0);
        this.container.add(this.titleText);

        this.option1 = scene.add.text(0, -38, '', {
            font: '11px monospace', color: '#00ff88', align: 'center',
        }).setOrigin(0.5, 0);
        this.container.add(this.option1);

        this.option2 = scene.add.text(0, -20, '', {
            font: '11px monospace', color: '#00ccff', align: 'center',
        }).setOrigin(0.5, 0);
        this.container.add(this.option2);

        this.hintText = scene.add.text(0, 0, '[1] Gärtner  [2] Kassierer', {
            font: '10px monospace', color: '#888', align: 'center',
        }).setOrigin(0.5, 0);
        this.container.add(this.hintText);

        // Tasten
        scene.input.keyboard.addKey('ONE').on('down', () => this.buy('gardener'));
        scene.input.keyboard.addKey('TWO').on('down', () => this.buy('cashier'));
    }

    show(station) {
        this.station = station;
        this.visible = true;

        const gCount = this.scene.employees?.filter(e => e.role === 'gardener').length || 0;
        const cCount = this.scene.employees?.filter(e => e.role === 'cashier').length || 0;

        const gPrice = this.getPrice('gardener', gCount);
        const cPrice = this.getPrice('cashier', cCount);

        this.option1.setText(`[1] Gärtner  €${gPrice} (${gCount} aktiv)`);
        this.option2.setText(`[2] Kassierer  €${cPrice} (${cCount} aktiv)`);

        const x = station.isoX;
        const y = (station.bounds?.top ?? station.isoY) - 60;
        this.container.setPosition(x, y);

        this.bg.clear();
        const w = 180, h = 75;
        this.bg.fillStyle(0x000000, 0.85);
        this.bg.fillRoundedRect(-w / 2, -58, w, h, 4);
        this.bg.lineStyle(1, 0x0088ff, 0.6);
        this.bg.strokeRoundedRect(-w / 2, -58, w, h, 4);

        this.container.setVisible(true);
    }

    hide() {
        if (!this.visible) return;
        this.visible = false;
        this.container.setVisible(false);
    }

    getPrice(role, count) {
        if (role === 'gardener') {
            return Math.round(EMPLOYEE.GARDENER_PRICE_BASE * Math.pow(EMPLOYEE.GARDENER_PRICE_MULT, count));
        }
        return Math.round(EMPLOYEE.CASHIER_PRICE_BASE * Math.pow(EMPLOYEE.CASHIER_PRICE_MULT, count));
    }

    buy(role) {
        if (!this.visible) return;
        const count = this.scene.employees?.filter(e => e.role === role).length || 0;
        const price = this.getPrice(role, count);
        if (!this.scene.state.spend(price)) return;

        this.scene.hireEmployee(role);
        this.show(this.station); // Refresh mit neuem Preis
    }
}
