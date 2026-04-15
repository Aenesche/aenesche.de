import Station from './Station.js';
import { COLORS, ISO, ITEMS } from '../../config/constants.js';
import { drawIsoTile, drawIsoCube } from '../../utils/iso.js';

const HEIGHT = 15;

export default class Bed extends Station {
    constructor(scene, gridX, gridY) {
        super(scene, gridX, gridY);
        // Beet-Zustand: 'empty' | 'growing' | 'ready' | 'rotten'
        // Aktuell nur empty/growing — Wachstums-Timer kommt im nächsten Schritt
        this.state = 'empty';
    }

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
        const player = this.scene.player;

        // Pflanzen: Player trägt Samen UND Beet ist leer
        if (this.state === 'empty' && player.hasItem() && player.carriedItem.itemDef.id === ITEMS.SEED.id) {
            return {
                type: 'tap',
                duration: 0,
                onComplete: () => {
                    player.dropItem();
                    this.state = 'growing';
                    console.log('🌱 Eingepflanzt');
                },
            };
        }

        // Sonst nichts möglich
        return null;
    }
}
