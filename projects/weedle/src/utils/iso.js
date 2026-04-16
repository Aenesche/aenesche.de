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
export function drawIsoTile(g, x, y, size, fillHex, fillAlpha, strokeAlpha) {
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + size, y + size / 2);
    g.lineTo(x, y + size);
    g.lineTo(x - size, y + size / 2);
    g.closePath();
    if (fillAlpha > 0) {
        g.fillStyle(fillHex, fillAlpha);
        g.fillPath();
    }
    if (strokeAlpha > 0) {
        g.lineStyle(1, fillHex, strokeAlpha);
        g.strokePath();
    }
}

// Würfel auf einem Iso-Tile. (x, y) ist die obere Diamond-Ecke des Tiles am Boden.
// Zeichnet rechte Seite, linke Seite und Deckel.
export function drawIsoCube(g, x, y, size, height, color, topAlpha, sideAlpha) {
    // Rechte Seite
    g.fillStyle(color, sideAlpha * 0.6);
    g.beginPath();
    g.moveTo(x, y + size);
    g.lineTo(x + size, y + size / 2);
    g.lineTo(x + size, y + size / 2 - height);
    g.lineTo(x, y + size - height);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, color, 1);
    g.strokePath();

    // Linke Seite
    g.fillStyle(color, sideAlpha);
    g.beginPath();
    g.moveTo(x, y + size);
    g.lineTo(x - size, y + size / 2);
    g.lineTo(x - size, y + size / 2 - height);
    g.lineTo(x, y + size - height);
    g.closePath();
    g.fillPath();
    g.strokePath();

    // Deckel
    drawIsoTile(g, x, y - height, size, color, topAlpha, 1);
}
