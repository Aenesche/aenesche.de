// Isometrische Koordinaten-Helfer.
// gridToIso: (x, y) auf dem Grid -> (px, py) auf dem Bildschirm
// isoToGrid: umgekehrt, fürs Klick-Picking später

import { ISO } from '../config/constants.js';

export function gridToIso(gridX, gridY, originX = 0, originY = 0) {
    return {
        x: originX + (gridX - gridY) * ISO.TILE_SIZE,
        y: originY + (gridX + gridY) * (ISO.TILE_SIZE / 2),
    };
}

export function isoToGrid(px, py, originX = 0, originY = 0) {
    const dx = px - originX;
    const dy = py - originY;
    return {
        x: (dx / ISO.TILE_SIZE + dy / (ISO.TILE_SIZE / 2)) / 2,
        y: (dy / (ISO.TILE_SIZE / 2) - dx / ISO.TILE_SIZE) / 2,
    };
}

// Tile-Mitte: das Zentrum des Diamonds bei (gridX, gridY) ist eigentlich
// der Punkt (gridX + 0.5, gridY + 0.5) im Grid.
export function gridToIsoCenter(gridX, gridY, originX = 0, originY = 0) {
    return gridToIso(gridX + 0.5, gridY + 0.5, originX, originY);
}

export function isoCenterToGrid(px, py, originX = 0, originY = 0) {
    const grid = isoToGrid(px, py, originX, originY);
    return { x: grid.x - 0.5, y: grid.y - 0.5 };
}
// --- Zeichen-Helfer ---
//
// WICHTIG: Phaser Graphics braucht fillStyle/lineStyle VOR beginPath(), und
// Fill und Stroke brauchen jeweils einen EIGENEN Pfad. Werden die Styles
// nachträglich gesetzt oder ein Pfad für beides benutzt, fallen Outlines
// sporadisch weg (je nach Batching-Reihenfolge). Deshalb hier strikt getrennt.

function polyPath(g, pts) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
}

export function fillPoly(g, pts, color, alpha) {
    if (alpha <= 0) return;
    g.fillStyle(color, alpha);
    polyPath(g, pts);
    g.fillPath();
}

export function strokePoly(g, pts, color, alpha, width = 1) {
    if (alpha <= 0) return;
    g.lineStyle(width, color, alpha);
    // Jede Kante als EIGENER Pfad. closePath()+strokePath() lässt in Phaser
    // je nach Batching-Zustand sporadisch die Schlusskante weg — deshalb hier
    // bewusst Kante für Kante, das kann nicht fehlschlagen.
    for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        g.beginPath();
        g.moveTo(a[0], a[1]);
        g.lineTo(b[0], b[1]);
        g.strokePath();
    }
}

// Diamant-Tile. (x, y) ist die obere Spitze.
export function drawIsoTile(g, x, y, size, fillHex, fillAlpha, strokeAlpha, strokeWidth = 1) {
    const pts = [
        [x, y],
        [x + size, y + size / 2],
        [x, y + size],
        [x - size, y + size / 2],
    ];
    fillPoly(g, pts, fillHex, fillAlpha);
    strokePoly(g, pts, fillHex, strokeAlpha, strokeWidth);
}

// Würfel auf einem Iso-Tile. (x, y) ist die obere Diamond-Spitze am Boden.
export function drawIsoCube(g, x, y, size, height, color, topAlpha, sideAlpha) {
    const half = size / 2;

    const rightFace = [
        [x, y + size],
        [x + size, y + half],
        [x + size, y + half - height],
        [x, y + size - height],
    ];
    const leftFace = [
        [x, y + size],
        [x - size, y + half],
        [x - size, y + half - height],
        [x, y + size - height],
    ];

    // Erst alle Flächen füllen, dann alle Konturen ziehen — so überdeckt
    // kein späterer Fill eine schon gezeichnete Linie.
    fillPoly(g, rightFace, color, sideAlpha * 0.6);
    fillPoly(g, leftFace, color, sideAlpha);
    drawIsoTile(g, x, y - height, size, color, topAlpha, 0);

    strokePoly(g, rightFace, color, 1);
    strokePoly(g, leftFace, color, 1);
    drawIsoTile(g, x, y - height, size, color, 0, 1);
}
