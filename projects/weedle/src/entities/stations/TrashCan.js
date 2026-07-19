import Station from './Station.js';
import { COLORS, ISO, UPGRADES } from '../../config/constants.js';
import { drawIsoCube } from '../../utils/iso.js';

const HEIGHT = 20;

export default class TrashCan extends Station {
    drawSelf(g) {
        drawIsoCube(g, this.isoX, this.isoY, ISO.TILE_SIZE * 0.6, HEIGHT, COLORS.TRASH, 0.3, 0.15);

        // X-Markierung auf dem Deckel
        const cx = this.isoX;
        const cy = this.isoY + ISO.TILE_SIZE / 2 - HEIGHT;
        g.lineStyle(2, 0xff4444, 0.8);
        g.beginPath(); g.moveTo(cx - 5, cy - 5); g.lineTo(cx + 5, cy + 5); g.strokePath();
        g.beginPath(); g.moveTo(cx + 5, cy - 5); g.lineTo(cx - 5, cy + 5); g.strokePath();

        this.bounds = {
            left:   this.isoX - ISO.TILE_SIZE,
            right:  this.isoX + ISO.TILE_SIZE,
            top:    this.isoY - HEIGHT - 10,
            bottom: this.isoY + ISO.TILE_SIZE,
        };
    }

    getInteraction() {
        const player = this.scene.player;
        if (!player.hasItem()) return null;

        const duration = UPGRADES.trash.effect(this.upgradeLevel);

        return {
            type: 'hold',
            duration: duration,
            onComplete: () => {
                const dropped = player.dropItem();
                if (dropped && dropped.id === 'rotten') {
                    this.scene.reportDisposed?.();
                }
            },
        };
    }

    onUpgrade(level) {
        // Effekt ist passiv (kürzere Hold-Dauer via getInteraction)
    }
}
