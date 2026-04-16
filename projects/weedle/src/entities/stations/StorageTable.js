import Station from './Station.js';
import { COLORS, ISO, STORAGE_TABLE } from '../../config/constants.js';
import { drawIsoTile, drawIsoCube } from '../../utils/iso.js';
import CarriedItem from '../CarriedItem.js';

export default class StorageTable extends Station {
    constructor(scene, gridX, gridY) {
        super(scene, gridX, gridY);
        this.heldItemDef = null; // ItemDef oder null

        // Item-Visual auf dem Tisch
        this.itemGfx = scene.add.graphics();
        this.itemGfx.setDepth(this.isoY + ISO.TILE_SIZE / 2 + 1);
    }

    drawSelf(g) {
        drawIsoCube(g, this.isoX, this.isoY, ISO.TILE_SIZE, STORAGE_TABLE.HEIGHT, COLORS.BED, 0.05, 0.05);
        drawIsoTile(g, this.isoX, this.isoY - STORAGE_TABLE.HEIGHT, ISO.TILE_SIZE, COLORS.BED, 0.05, 0.6);

        this.bounds = {
            left:   this.isoX - ISO.TILE_SIZE,
            right:  this.isoX + ISO.TILE_SIZE,
            top:    this.isoY - STORAGE_TABLE.HEIGHT,
            bottom: this.isoY + ISO.TILE_SIZE,
        };
    }

    drawItem() {
        const g = this.itemGfx;
        g.clear();
        if (!this.heldItemDef) return;

        const cx = this.isoX;
        const cy = this.isoY + ISO.TILE_SIZE / 2 - STORAGE_TABLE.HEIGHT - 8;

        g.fillStyle(this.heldItemDef.color, 1);
        g.fillEllipse(cx, cy, 12, 7);
        g.lineStyle(1.5, 0xffffff, 0.8);
        g.strokeEllipse(cx, cy, 12, 7);
    }

    getInteraction() {
        const player = this.scene.player;

        // Ablegen: Player trägt was, Tisch ist leer
        if (!this.heldItemDef && player.hasItem()) {
            return {
                type: 'tap',
                duration: 0,
                onComplete: () => {
                    this.heldItemDef = player.dropItem();
                    this.drawItem();
                },
            };
        }

        // Aufheben: Tisch hat was, Player ist leer
        if (this.heldItemDef && !player.hasItem()) {
            return {
                type: 'tap',
                duration: 0,
                onComplete: () => {
                    const item = new CarriedItem(this.scene, this.heldItemDef);
                    player.pickUp(item);
                    this.heldItemDef = null;
                    this.drawItem();
                },
            };
        }

        return null;
    }
}
