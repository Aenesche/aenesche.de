// Kasse: cyane Theke mit magenta Kassen-Aufsatz.
// Später: Kunden-Bestellungen aufnehmen (Hold-Interaktion).

import { COLORS, ISO } from '../../config/constants.js';
import { gridToIso, drawIsoCube } from '../../utils/iso.js';

const TABLE_HEIGHT = 15;

export default class Register {
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

        // Theke
        drawIsoCube(g, pos.x, pos.y, ISO.TILE_SIZE, TABLE_HEIGHT, COLORS.BED, 0.1, 0.05);

        // Kassen-Körper auf dem Deckel
        const rx = pos.x;
        const ry = pos.y - TABLE_HEIGHT + ISO.TILE_SIZE / 2;

        g.fillStyle(COLORS.REGISTER, 0.4);
        g.lineStyle(1, COLORS.REGISTER, 1);
        // Rechte Seite
        g.beginPath();
        g.moveTo(rx, ry); g.lineTo(rx + 10, ry - 5);
        g.lineTo(rx + 10, ry - 15); g.lineTo(rx, ry - 10);
        g.closePath(); g.fillPath(); g.strokePath();
        // Linke Seite
        g.beginPath();
        g.moveTo(rx, ry); g.lineTo(rx - 10, ry - 5);
        g.lineTo(rx - 10, ry - 15); g.lineTo(rx, ry - 10);
        g.closePath(); g.fillPath(); g.strokePath();

        // Cyanes Display
        g.fillStyle(COLORS.WALL, 1);
        g.beginPath();
        g.moveTo(rx - 8, ry - 7); g.lineTo(rx - 2, ry - 4);
        g.lineTo(rx - 2, ry - 10); g.lineTo(rx - 8, ry - 13);
        g.closePath(); g.fillPath();

        g.setDepth(pos.y + ISO.TILE_SIZE / 2);
    }
}
