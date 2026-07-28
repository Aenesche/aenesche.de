// Das Item, das eine Figur (Player oder Angestellter) gerade trägt.
// Schwebt überm Kopf. Wird beim Pickup an den Container der Figur gehängt.
//
// drawItemIcon ist die EINZIGE Stelle die Item-Optik definiert.
// StorageTable (und alles künftige, z.B. Regale) nutzt dieselbe Funktion —
// so sehen Items überall identisch aus.

import { fillPoly, strokePoly } from '../utils/iso.js';

// Zeichnet ein Item-Icon bei (cx, cy) auf ein Graphics-Objekt.
// scale: 1 = Standard (überm Kopf), Tische nutzen ~0.8
export function drawItemIcon(g, itemDef, cx = 0, cy = 0, scale = 1) {
    if (!itemDef) return;

    if (itemDef.id.startsWith('seed_')) {
        // Samen: gelber Tropfen (wie der Ur-Samen), Outline in Sorten-Farbe
        const pts = [
            [cx, cy - 6 * scale],
            [cx - 5 * scale, cy + 3 * scale],
            [cx + 5 * scale, cy + 3 * scale],
        ];
        fillPoly(g, pts, 0xffff00, 1);
        strokePoly(g, pts, itemDef.color, 1, 2);
    } else if (itemDef.id === 'rotten') {
        // Verfault: rotes X
        g.lineStyle(2.5, itemDef.color, 1);
        g.beginPath();
        g.moveTo(cx - 5 * scale, cy - 5 * scale);
        g.lineTo(cx + 5 * scale, cy + 5 * scale);
        g.strokePath();
        g.beginPath();
        g.moveTo(cx + 5 * scale, cy - 5 * scale);
        g.lineTo(cx - 5 * scale, cy + 5 * scale);
        g.strokePath();
    } else {
        // Pflanze: Oval in Sorten-Farbe mit weißer Outline
        g.fillStyle(itemDef.color, 1);
        g.fillEllipse(cx, cy, 10 * scale, 6 * scale);
        g.lineStyle(1.5, 0xffffff, 0.8);
        g.strokeEllipse(cx, cy, 10 * scale, 6 * scale);
    }
}

export default class CarriedItem {
    constructor(scene, itemDef) {
        this.scene = scene;
        this.itemDef = itemDef;

        this.graphics = scene.add.graphics();
        this.draw();
    }

    draw() {
        this.graphics.clear();
        drawItemIcon(this.graphics, this.itemDef, 0, 0, 1);
    }

    destroy() {
        this.graphics.destroy();
    }
}
