import Station from './Station.js';
import { COLORS, ISO } from '../../config/constants.js';
import { drawIsoTile, drawIsoCube } from '../../utils/iso.js';

const HEIGHT = 15;

export default class Bed extends Station {
    drawSelf(g) {
        drawIsoCube(g, this.isoX, this.isoY, ISO.TILE_SIZE, HEIGHT, COLORS.BED, 0.05, 0.05);
        drawIsoTile(g, this.isoX, this.isoY - HEIGHT, ISO.TILE_SIZE, COLORS.BED_PLANT, 0.08, 1);

        this.bounds = {
            left:   this.isoX - ISO.TILE_SIZE,
            right:  this.isoX + ISO.TILE_SIZE,
            top:    this.isoY - HEIGHT,
            bottom: this.isoY + ISO.TILE_SIZE,
        };
    }

    getInteraction() {
        return {
            type: 'tap',
            duration: 0,
            onComplete: () => {
                console.log('🪴 Beet interagiert (Platzhalter)');
            },
        };
    }
}
