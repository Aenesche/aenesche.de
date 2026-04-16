import Station from './Station.js';
import { COLORS, ISO, BUILD } from '../../config/constants.js';
import { drawIsoTile } from '../../utils/iso.js';

// Farben pro Typ
const TYPE_COLORS = {
    bed:      COLORS.BED_PLANT,
    register: COLORS.REGISTER,
    storage:  COLORS.BED,
};

const TYPE_LABELS = {
    bed:      'BEET',
    register: 'KASSE',
    storage:  'LAGER',
};

export default class BuildSlot extends Station {
    constructor(scene, gridX, gridY, type, index) {
        super(scene, gridX, gridY);
        this.type = type;       // 'bed', 'register', 'storage'
        this.slotIndex = index; // wievieltes dieses Typs (0-basiert)
        this.built = false;
        this.visible = false;

        // Preis aus der Tabelle (oder Infinity wenn keine Preise mehr)
        const prices = BUILD.PRICES[type] || [];
        this.price = index < prices.length ? prices[index] : Infinity;

        // Label
        this.label = scene.add.text(0, 0, '', {
            font: 'bold 11px monospace',
            color: '#888',
            align: 'center',
        });
        this.label.setOrigin(0.5, 0);
        this.label.setDepth(200);

        this.updateVisibility();
    }

    drawSelf(g) {
        // Wird bei jedem Visibility-Update neu gezeichnet
        this.bounds = {
            left:   this.isoX - ISO.TILE_SIZE,
            right:  this.isoX + ISO.TILE_SIZE,
            top:    this.isoY - 20,
            bottom: this.isoY + ISO.TILE_SIZE,
        };
    }

    updateVisibility() {
        if (this.built) {
            this.setHoloVisible(false);
            return;
        }
        this.setHoloVisible(this.visible);
    }

    setHoloVisible(show) {
        this.graphics.clear();
        this.label.setVisible(show);
        if (!show) return;

        const color = TYPE_COLORS[this.type] || 0xffffff;
        const g = this.graphics;
        const t = this.scene.time?.now || 0;
        const pulse = 0.3 + 0.2 * Math.sin(t / 12000 * Math.PI * 2);

        // Holographisches Boden-Tile: pulsierend, gestrichelt
        g.lineStyle(2, color, pulse);
        g.fillStyle(color, pulse * 0.15);

        g.beginPath();
        g.moveTo(this.isoX, this.isoY);
        g.lineTo(this.isoX + ISO.TILE_SIZE, this.isoY + ISO.TILE_SIZE / 2);
        g.lineTo(this.isoX, this.isoY + ISO.TILE_SIZE);
        g.lineTo(this.isoX - ISO.TILE_SIZE, this.isoY + ISO.TILE_SIZE / 2);
        g.closePath();
        g.fillPath();
        g.strokePath();

        // Holo-Plus-Zeichen in der Mitte
        const cx = this.isoX;
        const cy = this.isoY + ISO.TILE_SIZE / 2;
        g.lineStyle(2, color, pulse + 0.2);
        g.beginPath(); g.moveTo(cx - 6, cy); g.lineTo(cx + 6, cy); g.strokePath();
        g.beginPath(); g.moveTo(cx, cy - 6); g.lineTo(cx, cy + 6); g.strokePath();

        // Label mit Preis
        const name = TYPE_LABELS[this.type] || this.type;
        this.label.setText(`${name}\n€${this.price}`);
        this.label.setPosition(this.isoX, this.isoY + ISO.TILE_SIZE + 4);
    }

    // Puls-Animation: muss jedes Frame aufgerufen werden
    update() {
        if (this.visible && !this.built) {
            this.setHoloVisible(true);
        }
    }

    getInteraction() {
        if (this.built || !this.visible) return null;
        if (!this.scene.state.canAfford(this.price)) return null;

        return {
            type: 'hold',
            duration: 4000,
            onComplete: () => {
                if (!this.scene.state.spend(this.price)) return;
                this.built = true;
                this.updateVisibility();
                // Callback zur Scene: Station tatsächlich bauen
                this.scene.onBuildSlotPurchased(this);
            },
        };
    }

    // Occlusion deaktiviert für BuildSlots (sind flach auf dem Boden)
    updateOcclusion() {}
    occludesPlayerAt() { return false; }
}
