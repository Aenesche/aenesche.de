// CollisionGrid: 2D-Bool-Array, true = begehbar.
// Wird beim Platzieren von Stationen befüllt (block).
// Jeder Bewegungs-Check geht hier durch.

import { ISO } from '../config/constants.js';

export default class CollisionGrid {
    constructor() {
        const N = ISO.GRID_SIZE;
        this.walkable = Array.from({ length: N }, () => new Array(N).fill(true));
    }

    block(gridX, gridY) {
        const N = ISO.GRID_SIZE;
        const x = Math.floor(gridX);
        const y = Math.floor(gridY);
        if (x >= 0 && x < N && y >= 0 && y < N) {
            this.walkable[x][y] = false;
        }
    }

    isWalkable(gridX, gridY) {
        const N = ISO.GRID_SIZE;
        const x = Math.floor(gridX);
        const y = Math.floor(gridY);
        if (x < 0 || x >= N || y < 0 || y >= N) return false;
        return this.walkable[x][y];
    }

    // Player-Footprint-Check: 4 Ecken eines kleinen Quadrats um die Center-Position.
    // margin = halbe Footprint-Breite in Tiles.
    canStandAt(gridX, gridY, margin = 0.3) {
        return this.isWalkable(gridX - margin, gridY - margin)
            && this.isWalkable(gridX + margin, gridY - margin)
            && this.isWalkable(gridX - margin, gridY + margin)
            && this.isWalkable(gridX + margin, gridY + margin);
    }
}
