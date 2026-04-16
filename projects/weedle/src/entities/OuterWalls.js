// Vier Wand-Segmente. Jedes hat eigenes Graphics + bounds, damit es
// individuell transparent werden kann wenn der Player dahinter steht.
//
// Hintere Wände (top→right, top→left): hoch (BACK_HEIGHT)
// Vordere Wände (left→bottom, right→bottom): niedrig (FRONT_HEIGHT)
//   → niedrige Vorderwände sind die Standardlösung, damit das Innere sichtbar bleibt
//
// Depth: hintere Wände = -1000 (immer hinten), vordere Wände = sehr hoch (immer vorne)
//   → Vorderwände stehen visuell zwischen Player und Kamera, deshalb gehen sie
//     transparent damit der Player sichtbar bleibt.

import { COLORS, ISO, OCCLUSION, WALLS } from '../config/constants.js';
import { gridToIso } from '../utils/iso.js';
import { COLORS, ISO, OCCLUSION, WALLS, DOOR } from '../config/constants.js';

export function createOuterWalls(scene, originX, originY) {
    const N = ISO.GRID_SIZE;
    const top    = gridToIso(0, 0, originX, originY);
    const right  = gridToIso(N, 0, originX, originY);
    const left   = gridToIso(0, N, originX, originY);
    const bottom = gridToIso(N, N, originX, originY);

    // Tür-Lücke auf der right→bottom Wand. Tür ist bei gridX = DOOR.GRID_X, gridY = N.
    // Wir splitten die Wand in zwei Segmente mit einer Lücke von 1 Tile.
    const doorBefore = gridToIso(DOOR.GRID_X - 0.5, N, originX, originY);
    const doorAfter  = gridToIso(DOOR.GRID_X + 0.5, N, originX, originY);

    return [
        new WallSegment(scene, top, right, WALLS.BACK_HEIGHT, COLORS.WALL, false, -1000),
        new WallSegment(scene, top, left,  WALLS.BACK_HEIGHT, COLORS.WALL, false, -1000),
        new WallSegment(scene, left,  bottom, WALLS.FRONT_HEIGHT, COLORS.WALL, true, 100000),
        // Vordere Wand mit Tür-Lücke: zwei Segmente
        new WallSegment(scene, right, doorBefore, WALLS.FRONT_HEIGHT, COLORS.WALL, true, 100000),
        new WallSegment(scene, doorAfter, bottom, WALLS.FRONT_HEIGHT, COLORS.WALL, true, 100000),
    ];
}
class WallSegment {
    constructor(scene, from, to, height, color, occludable, depth) {
        this.scene = scene;
        this.from = from;
        this.to = to;
        this.height = height;
        this.occludable = occludable;

        this.graphics = scene.add.graphics();
        this.graphics.setDepth(depth);

        this.draw(color);

        this.targetAlpha = 1;
        this.currentAlpha = 1;

        // Bounds: Bounding-Box des sichtbaren Wand-Polygons
        this.bounds = {
            left:   Math.min(from.x, to.x),
            right:  Math.max(from.x, to.x),
            top:    Math.min(from.y, to.y) - height,
            bottom: Math.max(from.y, to.y),
        };
    }

    draw(color) {
        const g = this.graphics;
        const { from, to, height } = this;

        // Oberkante hell
        g.lineStyle(2, color, 0.9);
        g.beginPath();
        g.moveTo(from.x, from.y - height);
        g.lineTo(to.x,   to.y - height);
        g.strokePath();

        // Unterkante dezent
        g.lineStyle(1, color, 0.5);
        g.beginPath();
        g.moveTo(from.x, from.y);
        g.lineTo(to.x,   to.y);
        g.strokePath();

        // Vertikale Posts pro Tile-Schritt
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const tileLen = Math.hypot(ISO.TILE_SIZE, ISO.TILE_SIZE / 2);
        const segments = Math.max(1, Math.round(Math.hypot(dx, dy) / tileLen));

        g.lineStyle(1, color, 0.5);
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const px = from.x + dx * t;
            const py = from.y + dy * t;
            g.beginPath();
            g.moveTo(px, py);
            g.lineTo(px, py - height);
            g.strokePath();
        }
    }

    updateOcclusion(playerX, playerY) {
        if (!this.occludable) return;

        // Vorderwände sind unten am Bildschirm. Player ist "dahinter" wenn er
        // weiter oben ist als die Wand-Bottom (kleinere Y).
        const playerBehind = playerY < this.bounds.bottom - OCCLUSION.PLAYER_THRESHOLD;
        const playerInXRange = playerX > this.bounds.left && playerX < this.bounds.right;

        this.targetAlpha = (playerBehind && playerInXRange) ? OCCLUSION.ALPHA : 1;
        this.currentAlpha += (this.targetAlpha - this.currentAlpha) * OCCLUSION.LERP;
        this.graphics.setAlpha(this.currentAlpha);
    }
}
