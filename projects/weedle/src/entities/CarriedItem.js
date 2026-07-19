// Das Item, das eine Figur (Player oder Angestellter) gerade trägt.
// Visuell ein gelbes Oval mit Outline, schwebt überm Kopf.
// Wird beim Pickup an den Container der Figur gehängt.

import { ITEMS } from '../config/constants.js';

export default class CarriedItem {
    constructor(scene, itemDef) {
        this.scene = scene;
        this.itemDef = itemDef;

        this.graphics = scene.add.graphics();
        this.draw();
    }

    draw() {
        const g = this.graphics;
        g.clear();

        if (this.itemDef.id.startsWith('seed_')) {
            // Samen: gelber Tropfen (wie der Ur-Samen), Outline in Sorten-Farbe
            g.fillStyle(0xffff00, 1);
            g.lineStyle(2, this.itemDef.color, 1);
            g.beginPath();
            g.moveTo(0, -6);
            g.lineTo(-5, 3);
            g.lineTo(5, 3);
            g.closePath();
            g.fillPath();
            g.strokePath();
        } else if (this.itemDef.id === 'rotten') {
            // Verfault: rotes X
            g.lineStyle(2.5, this.itemDef.color, 1);
            g.beginPath(); g.moveTo(-5, -5); g.lineTo(5, 5); g.strokePath();
            g.beginPath(); g.moveTo(5, -5); g.lineTo(-5, 5); g.strokePath();
        } else {
            // Pflanze: Oval in Sorten-Farbe mit weißer Outline
            g.fillStyle(this.itemDef.color, 1);
            g.fillEllipse(0, 0, 10, 6);
            g.lineStyle(1.5, 0xffffff, 0.8);
            g.strokeEllipse(0, 0, 10, 6);
        }
    }

    destroy() {
        this.graphics.destroy();
    }
}
