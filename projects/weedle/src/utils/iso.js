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

// Tile-Mitte statt Tile-Ecke. Bequemer fürs Platzieren von Figuren/Objekten.
export function gridToIsoCenter(gridX, gridY, originX = 0, originY = 0) {
    const pos = gridToIso(gridX, gridY, originX, originY);
    return { x: pos.x, y: pos.y + ISO.TILE_SIZE / 2 };
}

export function isoCenterToGrid(px, py, originX = 0, originY = 0) {
    return isoToGrid(px, py - ISO.TILE_SIZE / 2, originX, originY);
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
