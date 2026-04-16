// Gehweg + Straße vor der Tür. Zeichnet außerhalb des Grids, unter allem.
// Rein visuell, keine Kollision, keine Logik.

import { COLORS, ISO, DOOR } from '../config/constants.js';
import { gridToIso, drawIsoTile } from '../utils/iso.js';

export function drawStreet(scene, originX, originY) {
    const g = scene.add.graphics();
    g.setDepth(-3000); // Unter allem (Grid ist -2000)

    // Gehweg: zwei Tile-Reihen vor der Tür, in Cyan-Wireframe
    // Liegt auf y = N+1 und y = N+2 am gridX bereich um die Tür
    const N = ISO.GRID_SIZE;

    g.lineStyle(1, COLORS.WALL, 0.3);
    for (let x = DOOR.GRID_X - 2; x <= DOOR.GRID_X + 2; x++) {
        for (let dy = 1; dy <= 2; dy++) {
            const pos = gridToIso(x, N + dy, originX, originY);
            drawIsoTile(g, pos.x, pos.y, ISO.TILE_SIZE, COLORS.WALL, 0.05, 0.3);
        }
    }

    // Straße: ab y = N+3, in dunklerem Farbton mit gelber Mittellinie
    const streetColor = 0x222244;
    const lineColor = 0xffff00;

    g.lineStyle(1, streetColor, 0.6);
    for (let x = DOOR.GRID_X - 4; x <= DOOR.GRID_X + 4; x++) {
        for (let dy = 3; dy <= 5; dy++) {
            const pos = gridToIso(x, N + dy, originX, originY);
            drawIsoTile(g, pos.x, pos.y, ISO.TILE_SIZE, streetColor, 0.3, 0.5);
        }
    }

    // Gestrichelte gelbe Mittellinie (auf der mittleren Straßenreihe, y = N+4)
    g.lineStyle(2, lineColor, 0.8);
    for (let x = DOOR.GRID_X - 4; x <= DOOR.GRID_X + 4; x += 2) {
        const a = gridToIso(x,     N + 4, originX, originY);
        const b = gridToIso(x + 1, N + 4, originX, originY);
        g.beginPath();
        g.moveTo(a.x, a.y + ISO.TILE_SIZE / 2);
        g.lineTo(b.x, b.y + ISO.TILE_SIZE / 2);
        g.strokePath();
    }
}
