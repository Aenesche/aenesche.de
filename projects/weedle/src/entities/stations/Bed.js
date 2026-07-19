import Station from './Station.js';
import { COLORS, ISO, ITEMS, SEED_VARIETIES, GROWTH, UPGRADES } from '../../config/constants.js';
import { drawIsoTile, drawIsoCube } from '../../utils/iso.js';
import CarriedItem from '../CarriedItem.js';
import PieTimer from '../PieTimer.js';

const HEIGHT = 15;

export default class Bed extends Station {
    constructor(scene, gridX, gridY) {
        super(scene, gridX, gridY);
        this.state = 'empty';
        this.stateTime = 0;
        this.plantedVariety = null; // SEED_VARIETIES entry

        this.tier = 0; // separater Upgrade-Zweig

        this.plantGfx = scene.add.graphics();
        this.plantGfx.setDepth(this.isoY + ISO.TILE_SIZE / 2 + 1);

        this.timer = new PieTimer(scene, COLORS.TIMER_GROW);
        this.timer.setPosition(this.isoX, this.isoY - HEIGHT - 30);
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

    update(delta) {
        if (this.state === 'empty') {
            this.timer.hide();
            return;
        }

        this.stateTime += delta;

        if (this.state === 'growing' && this.plantedVariety) {
            const growMultiplier = Math.pow(0.85, this.upgradeLevel);
            const baseDuration = this.plantedVariety.growTime;
            const adjustedDuration = baseDuration * growMultiplier;
            const progress = Math.min(this.stateTime / adjustedDuration, 1);
            this.timer.setColor(this.plantedVariety.color);
            this.timer.show(progress);
            this.drawPlant(progress, this.plantedVariety.color);
            if (progress >= 1) {
                this.state = 'ready';
                this.stateTime = 0;
            }
        } else if (this.state === 'ready') {
            const rotDuration = GROWTH.ROT_DURATION * (this.scene.levelConfig?.rotMultiplier ?? 1);
            const rotProgress = Math.min(this.stateTime / rotDuration, 1);
            this.timer.setColor(this.plantedVariety?.color || COLORS.TIMER_GROW);
            this.timer.show(1 - rotProgress);
            this.drawPlant(1, this.plantedVariety?.color || COLORS.BED_PLANT);
            if (rotProgress >= 1) {
                this.state = 'rotten';
                this.scene.reportRotten?.();
                this.stateTime = 0;
            }
        } else if (this.state === 'rotten') {
            this.timer.hide();
            this.drawPlant(1, COLORS.BED_ROTTEN);
        }
    }

    drawPlant(scale, color) {
        const g = this.plantGfx;
        g.clear();
        const cx = this.isoX;
        const cy = this.isoY + ISO.TILE_SIZE / 2 - HEIGHT;
        const h = 30 * scale;
        const w = 15 * scale;
        g.lineStyle(2, color, 1);
        g.fillStyle(color, 0.2);
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx - w, cy - h / 2);
        g.lineTo(cx, cy - h);
        g.lineTo(cx + w, cy - h / 2);
        g.closePath();
        g.fillPath();
        g.strokePath();
        g.fillStyle(color, 1);
        g.fillEllipse(cx, cy - h / 2, w / 2, h / 4);
    }

    // Kann diese Sorte hier gepflanzt werden?
    canPlant(variety) {
        return this.tier >= variety.requiredTier;
    }

    getInteraction() {
        const player = this.scene.player;

        // Pflanzen: Player trägt Samen, Beet ist leer, Tier passt
        if (this.state === 'empty' && player.hasItem()) {
            const itemDef = player.carriedItem.itemDef;
            if (itemDef.variety) {
                const variety = SEED_VARIETIES.find(v => v.id === itemDef.variety);
                if (variety && itemDef.id.startsWith('seed_') && this.canPlant(variety)) {
                    return {
                        type: 'tap',
                        duration: 0,
                        onComplete: () => {
                            player.dropItem();
                            this.plantedVariety = variety;
                            this.state = 'growing';
                            this.stateTime = 0;
                        },
                    };
                }
            }
        }

        // Ernten: erntereif, freie Hände
        if (this.state === 'ready' && !player.hasItem() && this.plantedVariety) {
            const plantItem = ITEMS[`plant_${this.plantedVariety.id}`];
            return {
                type: 'tap',
                duration: 0,
                onComplete: () => {
                    const plant = new CarriedItem(this.scene, plantItem);
                    player.pickUp(plant);
                    this.state = 'empty';
                    this.stateTime = 0;
                    this.plantedVariety = null;
                    this.plantGfx.clear();
                },
            };
        }

        // Verfault: aufheben zum Entsorgen
        if (this.state === 'rotten' && !player.hasItem()) {
            return {
                type: 'tap',
                duration: 0,
                onComplete: () => {
                    const rotten = new CarriedItem(this.scene, ITEMS.ROTTEN);
                    player.pickUp(rotten);
                    this.state = 'empty';
                    this.stateTime = 0;
                    this.plantedVariety = null;
                    this.plantGfx.clear();
                },
            };
        }

        return null;
    }

    onUpgrade(level) {}
}
