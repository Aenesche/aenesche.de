// Samen-Terminal: oranger Würfel mit gelbem Holo-Samen.
// Aktuell rein dekorativ — Interaktion (Hold-to-buy) kommt später.

import { COLORS, ISO } from '../../config/constants.js';
import { gridToIso, drawIsoCube } from '../../utils/iso.js';

const HEIGHT = 30;

export default class SeedTerminal {
    constructor(scene, gridX, gridY) {
        this.scene = scene;
        this.gridX = gridX;
        this.gridY = gridY;
        this.draw();
    }

    getTiles() {
        return [{ x: this.gridX, y: this.gridY }];
    }

    draw() {
        const g = this.scene.add.graphics();
        const pos = gridToIso(this.gridX, this.gridY, this.scene.originX, this.scene.originY);

        // Würfel
        drawIsoCube(g, pos.x, pos.y, ISO.TILE_SIZE, HEIGHT, COLORS.SEED_SHOP, 0.2, 0.1);

        // Samen-Hologramm über dem Deckel
        const cx = pos.x;
        const cy = pos.y + ISO.TILE_SIZE / 2 - HEIGHT - 10;
        g.lineStyle(2, 0xffff00, 1);
        g.strokeEllipse(cx, cy, 16, 8);
        g.fillStyle(0xffff00, 1);
        g.fillCircle(cx, cy, 3);

        // Depth = Footprint-Center auf dem Boden, damit Stationen im Iso korrekt sortieren
        g.setDepth(pos.y + ISO.TILE_SIZE / 2);
    }
}
