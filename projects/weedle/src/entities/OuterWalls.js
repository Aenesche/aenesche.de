// Außenwände. Konvention im Iso-Genre:
// - Hintere Wände (NW/NO im Welt-Sinn = oben am Bildschirm) werden voll gezeichnet
// - Vordere Kanten nur als Bodenlinie, sonst würden sie den Player verdecken
// Kollision passiert separat in der CollisionGrid (Außenrand der Tiles).

import { COLORS, ISO } from '../config/constants.js';
import { gridToIso } from '../utils/iso.js';

const WALL_HEIGHT = 70;

export function drawOuterWalls(scene, originX, originY) {
    const g = scene.add.graphics();
    g.setDepth(1);

    const N = ISO.GRID_SIZE;

    // Vier Eckpunkte des Grids in Iso-Koordinaten
    const top    = gridToIso(0, 0, originX, originY); // oben am Bildschirm
    const right  = gridToIso(N, 0, originX, originY); // rechts
    const left   = gridToIso(0, N, originX, originY); // links
    const bottom = gridToIso(N, N, originX, originY); // unten

    // Hintere Wände: top→right (Welt-Norden) und top→left (Welt-Westen)
    drawWallSegment(g, top, right, WALL_HEIGHT, COLORS.WALL);
    drawWallSegment(g, top, left,  WALL_HEIGHT, COLORS.WALL);

    // Vordere Kanten: nur Bodenlinie, kein Aufbau
    g.lineStyle(2, COLORS.WALL, 0.5);
    g.beginPath();
    g.moveTo(left.x,  left.y);  g.lineTo(bottom.x, bottom.y);
    g.moveTo(right.x, right.y); g.lineTo(bottom.x, bottom.y);
    g.strokePath();
}

function drawWallSegment(g, from, to, height, color) {
    // Schwacher Fill als "Glas"
    g.fillStyle(color, 0.04);
    g.beginPath();
    g.moveTo(from.x, from.y);
    g.lineTo(to.x,   to.y);
    g.lineTo(to.x,   to.y - height);
    g.lineTo(from.x, from.y - height);
    g.closePath();
    g.fillPath();

    // Oberkante hell, Unterkante dezent
    g.lineStyle(2, color, 0.9);
    g.beginPath();
    g.moveTo(from.x, from.y - height);
    g.lineTo(to.x,   to.y - height);
    g.strokePath();

    g.lineStyle(1, color, 0.4);
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
