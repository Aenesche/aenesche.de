import Station from './Station.js';
import { COLORS, ISO } from '../../config/constants.js';
import { drawIsoCube } from '../../utils/iso.js';

const HEIGHT = 25;

export default class HiringStation extends Station {
    drawSelf(g) {
        drawIsoCube(g, this.isoX, this.isoY, ISO.TILE_SIZE, HEIGHT, COLORS.EMPLOYEE, 0.2, 0.1);

        const cx = this.isoX;
        const cy = this.isoY + ISO.TILE_SIZE / 2 - HEIGHT - 5;
        g.fillStyle(COLORS.EMPLOYEE, 1);
        g.fillCircle(cx, cy - 4, 4);
        g.fillRect(cx - 4, cy, 8, 6);

        this.bounds = {
            left:   this.isoX - ISO.TILE_SIZE,
            right:  this.isoX + ISO.TILE_SIZE,
            top:    this.isoY - HEIGHT - 15,
            bottom: this.isoY + ISO.TILE_SIZE,
        };
    }

    // E öffnet das Hiring-Popup
    getInteraction() {
        return {
            type: 'tap',
            duration: 0,
            onComplete: () => {
                this.scene.upgrades.hiringPopup.show(this);
            },
        };
    }
}
