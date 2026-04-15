// Haupt-Scene. Aktuell nur das leere Iso-Grid + Platzhalter-Text.
// Im nächsten Schritt: Player-Movement und Wände.

import { GAME, ISO, COLORS } from '../config/constants.js';
import { gridToIso, drawIsoTile } from '../utils/iso.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        // Grid mittig auf der Bühne platzieren
        this.originX = GAME.WIDTH / 2;
        this.originY = 100;

        this.drawGrid();

        this.add.text(20, 20, 'WEEDLE — Setup OK', {
            font: '14px monospace',
            color: '#00ff88',
        });
        this.add.text(20, 40, 'Nächster Schritt: Player + Wände', {
            font: '12px monospace',
            color: '#888',
        });
    }

    drawGrid() {
        const g = this.add.graphics();
        g.lineStyle(1, COLORS.GRID, 0.4);

        for (let x = 0; x <= ISO.GRID_SIZE; x++) {
            for (let y = 0; y <= ISO.GRID_SIZE; y++) {
                const pos = gridToIso(x, y, this.originX, this.originY);
                drawIsoTile(g, pos.x, pos.y, ISO.TILE_SIZE, COLORS.GRID, 0, 0.4);
            }
        }
    }
}
