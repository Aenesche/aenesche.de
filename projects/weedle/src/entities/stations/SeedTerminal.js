import Station from './Station.js';
import { COLORS, ISO } from '../../config/constants.js';
import { drawIsoCube } from '../../utils/iso.js';

const HEIGHT = 30;

export default class SeedTerminal extends Station {
    drawSelf(g) {
        drawIsoCube(g, this.isoX, this.isoY, ISO.TILE_SIZE, HEIGHT, COLORS.SEED_SHOP, 0.2, 0.1);

        // Samen-Hologramm über dem Deckel
        const cx = this.isoX;
        const cy = this.isoY + ISO.TILE_SIZE / 2 - HEIGHT - 10;
        g.lineStyle(2, 0xffff00, 1);
        g.strokeEllipse(cx, cy, 16, 8);
        g.fillStyle(0xffff00, 1);
        g.fillCircle(cx, cy, 3);

        this.bounds = {
            left:   this.isoX - ISO.TILE_SIZE,
            right:  this.isoX + ISO.TILE_SIZE,
            top:    this.isoY - HEIGHT - 20,
            bottom: this.isoY + ISO.TILE_SIZE,
        };
    }
}
