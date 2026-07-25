import Station from './Station.js';
import { COLORS, ISO, STORAGE_TABLE } from '../../config/constants.js';
import { drawIsoTile, drawIsoCube } from '../../utils/iso.js';
import CarriedItem, { drawItemIcon } from '../CarriedItem.js';
import { Audio } from '../../audio/AudioManager.js';

export default class StorageTable extends Station {
    constructor(scene, gridX, gridY) {
        super(scene, gridX, gridY);
        this.slots = [null];
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

    onUpgrade(level) {
        const maxSlots = Math.min(1 + level, 4);
        while (this.slots.length < maxSlots) {
            this.slots.push(null);
        }
    }

    get usedSlots() { return this.slots.filter(s => s !== null).length; }
    get freeSlots() { return this.slots.filter(s => s === null).length; }
    get firstItem() { return this.slots.find(s => s !== null); }

    drawItem() {
        const g = this.itemGfx;
        g.clear();
        const items = this.slots.filter(s => s !== null);
        if (items.length === 0) return;

        const cx = this.isoX;
        const cy = this.isoY + ISO.TILE_SIZE / 2 - STORAGE_TABLE.HEIGHT - 8;

        items.forEach((itemDef, i) => {
            const offsetX = (i - (items.length - 1) / 2) * 12;
            drawItemIcon(g, itemDef, cx + offsetX, cy, 0.8);
        });
    }

    getInteraction() {
        const player = this.scene.player;

        if (this.freeSlots > 0 && player.hasItem()) {
            return {
                type: 'tap',
                duration: 0,
                onComplete: () => {
                    const itemDef = player.dropItem();
                    const freeIdx = this.slots.indexOf(null);
                    this.slots[freeIdx] = itemDef;
                    Audio.play('drop');
                    this.drawItem();
                },
            };
        }

        if (this.usedSlots > 0 && !player.hasItem()) {
            return {
                type: 'tap',
                duration: 0,
                onComplete: () => {
                    const idx = this.slots.findIndex(s => s !== null);
                    const itemDef = this.slots[idx];
                    this.slots[idx] = null;
                    const item = new CarriedItem(this.scene, itemDef);
                    player.pickUp(item);
                    Audio.play('pickup');
                    this.drawItem();
                },
            };
        }

        return null;
    }
}
