// Pflanz-Beet: cyane Theke mit grüner Beet-Oberfläche.
// Später: Pflanze + Wachstums-Timer + Verfaul-Mechanik.

import { COLORS, ISO } from '../../config/constants.js';
import { gridToIso, drawIsoTile, drawIsoCube } from '../../utils/iso.js';

const HEIGHT = 15;

export default class Bed {
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

        // Theke (cyan)
        drawIsoCube(g, pos.x, pos.y, ISO.TILE_SIZE, HEIGHT, COLORS.BED, 0.05, 0.05);

        // Beet-Deckel (grün) — überschreibt den Cube-Deckel mit anderer Farbe
        drawIsoTile(g, pos.x, pos.y - HEIGHT, ISO.TILE_SIZE, COLORS.BED_PLANT, 0.08, 1);

        g.setDepth(pos.y + ISO.TILE_SIZE / 2);
    }
}
