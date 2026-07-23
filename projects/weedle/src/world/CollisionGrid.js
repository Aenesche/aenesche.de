// CollisionGrid: Single Source of Truth für Begehbarkeit.
//
// Drei Zonen:
//   1. Innenraum (0..N-1): frei, außer Stationen blocken
//   2. Wand-Reihe (y === N): NUR das Tür-Tile ist offen — die untere linke
//      Wand ist damit überall sonst dicht
//   3. Straße/Gehweg (y = N+1 .. N+STREET_DEPTH): frei begehbar (auch für
//      den Player — zum Mülleimer laufen), Stationen draußen blocken
//
// Passanten IGNORIEREN dieses Grid komplett (laufen auf festen Pfaden).

import { ISO, DOOR } from '../config/constants.js';

const STREET_DEPTH = 5;   // wie weit man nach draußen laufen kann (Tiles)
const STREET_MARGIN = 2;  // seitlicher Spielraum links/rechts vom Grid

export default class CollisionGrid {
    constructor() {
        const N = ISO.GRID_SIZE;
        this.walkable = Array.from({ length: N }, () => new Array(N).fill(true));
        this.blockedOutside = new Set(); // Stationen außerhalb (z.B. Mülleimer)
    }

    key(x, y) { return `${x},${y}`; }

    block(gridX, gridY) {
        const N = ISO.GRID_SIZE;
        const x = Math.floor(gridX);
        const y = Math.floor(gridY);
        if (x >= 0 && x < N && y >= 0 && y < N) {
            this.walkable[x][y] = false;
        } else {
            this.blockedOutside.add(this.key(x, y));
        }
    }

    isWalkable(gridX, gridY) {
        const N = ISO.GRID_SIZE;
        const x = Math.floor(gridX);
        const y = Math.floor(gridY);

        // Innenraum
        if (x >= 0 && x < N && y >= 0 && y < N) {
            return this.walkable[x][y];
        }

        // Wand-Reihe: nur die Tür ist offen
        if (y === N) {
            return x === DOOR.GRID_X && !this.blockedOutside.has(this.key(x, y));
        }

        // Straße + Gehweg
        if (y > N && y <= N + STREET_DEPTH
            && x >= -STREET_MARGIN && x <= N + STREET_MARGIN) {
            return !this.blockedOutside.has(this.key(x, y));
        }

        return false;
    }

    canStandAt(gridX, gridY, margin = 0.3) {
        return this.isWalkable(gridX - margin, gridY - margin)
            && this.isWalkable(gridX + margin, gridY - margin)
            && this.isWalkable(gridX - margin, gridY + margin)
            && this.isWalkable(gridX + margin, gridY + margin);
    }
}
