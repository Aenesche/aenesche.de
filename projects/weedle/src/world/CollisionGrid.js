import { ISO, DOOR } from '../config/constants.js';

export default class CollisionGrid {
    constructor() {
        const N = ISO.GRID_SIZE;
        this.walkable = Array.from({ length: N }, () => new Array(N).fill(true));
        // Extra-Tiles außerhalb des Grids (für Queue draußen + Tür)
        // Wir erlauben einen Korridor bei gridX = DOOR.GRID_X bis y = N + 3
        // UND seitlich für die Warteschlange
        this.extraWalkable = new Set();
        for (let dy = 0; dy <= 3; dy++) {
            for (let dx = -1; dx <= 5; dx++) { // Tür und Bereich rechts davon
                this.extraWalkable.add(`${DOOR.GRID_X + dx},${N + dy}`);
            }
        }
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
        // Innerhalb des Hauptgrids
        if (x >= 0 && x < N && y >= 0 && y < N) {
            return this.walkable[x][y];
        }
        // Außerhalb: nur die expliziten Extra-Tiles
        return this.extraWalkable.has(`${x},${y}`);
    }

    canStandAt(gridX, gridY, margin = 0.3) {
        return this.isWalkable(gridX - margin, gridY - margin)
            && this.isWalkable(gridX + margin, gridY - margin)
            && this.isWalkable(gridX - margin, gridY + margin)
            && this.isWalkable(gridX + margin, gridY + margin);
    }
}
