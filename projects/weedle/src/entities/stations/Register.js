import Station from './Station.js';
import { COLORS, ISO } from '../../config/constants.js';
import { drawIsoCube } from '../../utils/iso.js';

const TABLE_HEIGHT = 15;

export default class Register extends Station {
    drawSelf(g) {
        drawIsoCube(g, this.isoX, this.isoY, ISO.TILE_SIZE, TABLE_HEIGHT, COLORS.BED, 0.1, 0.05);

        const rx = this.isoX;
        const ry = this.isoY - TABLE_HEIGHT + ISO.TILE_SIZE / 2;

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

        this.bounds = {
            left:   this.isoX - ISO.TILE_SIZE,
            right:  this.isoX + ISO.TILE_SIZE,
            top:    this.isoY - TABLE_HEIGHT - 15,
            bottom: this.isoY + ISO.TILE_SIZE,
        };
    }
}
