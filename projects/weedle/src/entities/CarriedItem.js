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

        if (this.itemDef.id === ITEMS.SEED.id) {
            // Stilisierter Samen: gelbes Oval mit Outline
            g.fillStyle(this.itemDef.color, 1);
            g.fillEllipse(0, 0, 10, 6);
            g.lineStyle(1.5, 0xffffff, 0.8);
            g.strokeEllipse(0, 0, 10, 6);
        } else {
            // Generisches Item-Visual als Fallback
            g.fillStyle(this.itemDef.color, 1);
            g.fillCircle(0, 0, 5);
        }
    }

    destroy() {
        this.graphics.destroy();
    }
}
