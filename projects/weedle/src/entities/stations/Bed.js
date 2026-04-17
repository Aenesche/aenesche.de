import Station from './Station.js';
import { COLORS, ISO, ITEMS, GROWTH } from '../../config/constants.js';
import { drawIsoTile, drawIsoCube } from '../../utils/iso.js';
import CarriedItem from '../CarriedItem.js';
import PieTimer from '../PieTimer.js';

const HEIGHT = 15;

// State-Machine:
//   empty   → (Samen einpflanzen) → growing
//   growing → (Timer abgelaufen)  → ready
//   ready   → (zu lange gewartet) → rotten
//   ready   → (geerntet)          → empty
//   rotten  → (geerntet)          → empty (kein Item, weil wertlos)

export default class Bed extends Station {
    constructor(scene, gridX, gridY) {
        super(scene, gridX, gridY);
        this.state = 'empty';
        this.stateTime = 0; // ms seit aktuellem State

        // Pflanzen-Visual: eigenes Graphics, das je nach State neugezeichnet wird
        this.plantGfx = scene.add.graphics();
        this.plantGfx.setDepth(this.isoY + ISO.TILE_SIZE / 2 + 1); // Knapp über Beet

        // Wachstums-Timer (cyan), wird in update() positioniert
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

    // Wird von der Scene jedes Frame aufgerufen
    update(delta) {
        if (this.state === 'empty') {
            this.timer.hide();
            return;
        }

        this.stateTime += delta;

        if (this.state === 'growing') {
            const growMultiplier = Math.pow(0.85, this.upgradeLevel);
            const adjustedDuration = GROWTH.GROW_DURATION * growMultiplier;
            const progress = Math.min(this.stateTime / adjustedDuration, 1);
            this.timer.setColor(COLORS.TIMER_GROW);
            this.timer.show(progress);
            this.drawPlant(progress, COLORS.BED_PLANT);
            if (progress >= 1) {
                this.state = 'ready';
                this.stateTime = 0;
            }
        } else if (this.state === 'ready') {
            // Anti-Progress: zeigt wie lange noch bis verfault
            const rotProgress = Math.min(this.stateTime / GROWTH.ROT_DURATION, 1);
            this.timer.setColor(COLORS.TIMER_GROW);
            this.timer.show(1 - rotProgress);
            this.drawPlant(1, COLORS.BED_PLANT);
            if (rotProgress >= 1) {
                this.state = 'rotten';
                this.stateTime = 0;
            }
        } else if (this.state === 'rotten') {
            this.timer.hide();
            this.drawPlant(1, COLORS.BED_ROTTEN);
        }
    }

    // Skaliert die Pflanze von 0 (Sprössling) bis 1 (vollständig)
    drawPlant(scale, color) {
        const g = this.plantGfx;
        g.clear();

        const cx = this.isoX;
        const cy = this.isoY + ISO.TILE_SIZE / 2 - HEIGHT;
        const h = 30 * scale;
        const w = 15 * scale;

        // Diamantförmige Kristall-Pflanze (passt zum Neon-Look)
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

        // Innere Glow-Ellipse für Detail
        g.fillStyle(color, 1);
        g.fillEllipse(cx, cy - h / 2, w / 2, h / 4);
    }

    getInteraction() {
        const player = this.scene.player;

        // Pflanzen: Player trägt Samen UND Beet ist leer
        if (this.state === 'empty'
            && player.hasItem()
            && player.carriedItem.itemDef.id === ITEMS.SEED.id) {
            return {
                type: 'tap',
                duration: 0,
                onComplete: () => {
                    player.dropItem();
                    this.state = 'growing';
                    this.stateTime = 0;
                },
            };
        }

        // Ernten: Beet ist erntereif UND Player hat freie Hände
        if (this.state === 'ready' && !player.hasItem()) {
            return {
                type: 'tap',
                duration: 0,
                onComplete: () => {
                    const plant = new CarriedItem(this.scene, ITEMS.PLANT);
                    player.pickUp(plant);
                    this.state = 'empty';
                    this.stateTime = 0;
                    this.plantGfx.clear();
                },
            };
        }

        // Wegräumen: Verfault, Player hat freie Hände → kostenlos clearen
        if (this.state === 'rotten' && !player.hasItem()) {
            return {
                type: 'tap',
                duration: 0,
                onComplete: () => {
                    this.state = 'empty';
                    this.stateTime = 0;
                    this.plantGfx.clear();
                },
            };
        }

        return null;
    }
}
