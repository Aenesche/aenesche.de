import Station from './Station.js';
import { COLORS, ISO, SEED_VARIETIES, ITEMS, UPGRADES } from '../../config/constants.js';
import { drawIsoCube } from '../../utils/iso.js';
import CarriedItem from '../CarriedItem.js';

const HEIGHT = 30;

export default class SeedTerminal extends Station {
    constructor(scene, gridX, gridY, varietyId) {
        super(scene, gridX, gridY);
        this.variety = SEED_VARIETIES.find(v => v.id === varietyId) || SEED_VARIETIES[0];
        // drawSelf wurde schon von super() aufgerufen, aber ohne variety.
        // Nochmal zeichnen jetzt wo variety gesetzt ist.
        this.graphics.clear();
        this.drawSelf(this.graphics);
    }

    drawSelf(g) {
        drawIsoCube(g, this.isoX, this.isoY, ISO.TILE_SIZE, HEIGHT, this.variety.color, 0.2, 0.1);

        // Hologramm in Sorten-Farbe
        const cx = this.isoX;
        const cy = this.isoY + ISO.TILE_SIZE / 2 - HEIGHT - 10;
        g.lineStyle(2, this.variety.color, 1);
        g.strokeEllipse(cx, cy, 16, 8);
        g.fillStyle(this.variety.color, 1);
        g.fillCircle(cx, cy, 3);

        // Sorten-Label
        this.label = this.scene.add.text(this.isoX, this.isoY + ISO.TILE_SIZE + 4, this.variety.label, {
            font: '10px monospace',
            color: '#' + this.variety.color.toString(16).padStart(6, '0'),
            align: 'center',
        }).setOrigin(0.5, 0).setDepth(200);

        this.bounds = {
            left:   this.isoX - ISO.TILE_SIZE,
            right:  this.isoX + ISO.TILE_SIZE,
            top:    this.isoY - HEIGHT - 20,
            bottom: this.isoY + ISO.TILE_SIZE,
        };
    }

    getInteraction() {
        const player = this.scene.player;
        const state = this.scene.state;

        if (player.hasItem()) return null;
        if (!state.canAfford(this.variety.seedCost)) return null;

        const seedItem = ITEMS[`seed_${this.variety.id}`];

        return {
            type: 'hold',
            duration: 2000,
            onComplete: () => {
                if (!state.spend(this.variety.seedCost)) return;
                const seed = new CarriedItem(this.scene, seedItem);
                player.pickUp(seed);
            },
        };
    }

    onUpgrade(level) {}
}
