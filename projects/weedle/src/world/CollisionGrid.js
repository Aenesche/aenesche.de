// CollisionGrid: Single Source of Truth für Begehbarkeit.
//
// Modell:
//   - Begehbare FLÄCHE: Innenraum (0..N-1) + Außenbereich (Straße/Gehweg)
//   - Wände sind LINIEN auf Tile-Grenzen, keine Tile-Reihen:
//       · vordere linke Wand  = Linie y = N  (Tür-Lücke bei DOOR.GRID_X)
//       · vordere rechte Wand = Linie x = N  (dicht)
//     Die hinteren Wände sind schlicht der Rand des Innenraums.
//   - Stationen blocken ihr Tile (innen wie außen, z.B. Mülleimer).
//
// Zwei Prüf-Ebenen:
//   isWalkable(x,y)  → Tile frei? (Pathfinding + Grobprüfung)
//   canCross(a→b)    → Wandlinie zwischen zwei Tiles? (Pathfinding)
//   canStandAt(x,y)  → Player-Footprint frei UND nicht in einer Wandlinie?

import { ISO, DOOR } from '../config/constants.js';

const N = ISO.GRID_SIZE;

// Außenbereich: wie weit man ums Gebäude / auf der Straße laufen darf
const OUT_MIN_X = -2;
const OUT_MAX_X = N + 2;
const OUT_MAX_Y = N + 5;

// Halbe Dicke der Wandlinien in Grid-Einheiten.
// Groß genug, dass niemand bei hohem Tempo durchtunnelt.
const WALL_HALF = 0.25;

export default class CollisionGrid {
    constructor() {
        this.walkable = Array.from({ length: N }, () => new Array(N).fill(true));
        this.blockedOutside = new Set();
    }

    key(x, y) { return `${x},${y}`; }

    block(gridX, gridY) {
        const x = Math.floor(gridX);
        const y = Math.floor(gridY);
        if (x >= 0 && x < N && y >= 0 && y < N) {
            this.walkable[x][y] = false;
        } else {
            this.blockedOutside.add(this.key(x, y));
        }
    }

    // Tile-Ebene: im Spielbereich und frei?
    isWalkable(gridX, gridY) {
        const x = Math.floor(gridX);
        const y = Math.floor(gridY);

        if (x >= 0 && x < N && y >= 0 && y < N) {
            return this.walkable[x][y];
        }
        // Außenbereich: alles ab der Wandlinie y=N nach unten
        if (y >= N && y <= OUT_MAX_Y && x >= OUT_MIN_X && x <= OUT_MAX_X) {
            return !this.blockedOutside.has(this.key(x, y));
        }
        return false;
    }

    // Kanten-Ebene für Pathfinding: kreuzt der Schritt eine Wandlinie?
    canCross(x1, y1, x2, y2) {
        // Vordere linke Wand auf der Linie y = N
        if (Math.min(y1, y2) === N - 1 && Math.max(y1, y2) === N) {
            if (x1 !== x2) return false;        // diagonal durch die Wand: nie
            return x1 === DOOR.GRID_X;          // nur durch die Tür
        }
        // Vordere rechte Wand auf der Linie x = N
        if (Math.min(x1, x2) === N - 1 && Math.max(x1, x2) === N) return false;
        return true;
    }

    // Liegt ein Punkt in einer Wandlinie?
    inWallLine(gx, gy) {
        // Linie y = N, nur entlang der Gebäudefront (x zwischen 0 und N)
        if (Math.abs(gy - N) < WALL_HALF && gx >= 0 && gx <= N) {
            const inDoor = gx >= DOOR.GRID_X && gx <= DOOR.GRID_X + 1;
            if (!inDoor) return true;
        }
        // Linie x = N, nur entlang der Gebäudeseite (y zwischen 0 und N)
        if (Math.abs(gx - N) < WALL_HALF && gy >= 0 && gy <= N) return true;
        return false;
    }

    // Punkt-Ebene: 4 Footprint-Ecken frei und keine Wandlinie berührt
    canStandAt(gridX, gridY, margin = 0.3) {
        const corners = [
            [gridX - margin, gridY - margin],
            [gridX + margin, gridY - margin],
            [gridX - margin, gridY + margin],
            [gridX + margin, gridY + margin],
        ];
        for (const [cx, cy] of corners) {
            if (!this.isWalkable(cx, cy)) return false;
            if (this.inWallLine(cx, cy)) return false;
        }
        // Zusätzlich das Zentrum prüfen (schmale Wand exakt mittig treffen)
        return !this.inWallLine(gridX, gridY);
    }
}
