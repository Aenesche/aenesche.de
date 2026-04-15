// Haupt-Scene. Grid + Außenwände + Player mit Kollision.
//
// Bewegungs-Modell:
// - Player bewegt sich frei in Screen-Pixeln (WASD/Arrows)
// - Diagonale Eingabe wird normalisiert
// - Vor jedem Schritt fragt der Player canMoveTo() — wir konvertieren die
//   Ziel-Screen-Position in Grid-Koordinaten und prüfen, ob das Tile begehbar ist
// - X und Y werden separat geprüft → Sliden an Wänden funktioniert automatisch
//
// Später: canMoveTo nutzt die CollisionGrid (für platzierte Stationen + Innenwände).

import { GAME, ISO, COLORS } from '../config/constants.js';
import { gridToIso, gridToIsoCenter, isoCenterToGrid, drawIsoTile } from '../utils/iso.js';
import Player from '../entities/Player.js';
import { drawOuterWalls } from '../entities/OuterWalls.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        // Grid mittig auf der Bühne, etwas Platz oben für Wände
        this.originX = GAME.WIDTH / 2;
        this.originY = 140;

        this.drawGrid();
        drawOuterWalls(this, this.originX, this.originY);

        // Player in der Mitte spawnen
        const spawn = gridToIsoCenter(ISO.GRID_SIZE / 2, ISO.GRID_SIZE / 2, this.originX, this.originY);
        this.player = new Player(this, spawn.x, spawn.y);

        this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');

        // Debug HUD
        this.debugText = this.add.text(20, 20, '', {
            font: '12px monospace',
            color: '#00ff88',
        });
    }

    update(time, delta) {
        let dirX = 0, dirY = 0;
        if (this.keys.A.isDown || this.keys.LEFT.isDown)  dirX = -1;
        if (this.keys.D.isDown || this.keys.RIGHT.isDown) dirX =  1;
        if (this.keys.W.isDown || this.keys.UP.isDown)    dirY = -1;
        if (this.keys.S.isDown || this.keys.DOWN.isDown)  dirY =  1;

        this.player.update(delta, dirX, dirY, (x, y) => this.canMoveTo(x, y));

        const grid = isoCenterToGrid(this.player.x, this.player.y, this.originX, this.originY);
        this.debugText.setText([
            'WEEDLE — Movement OK',
            'WASD / Pfeiltasten',
            `grid: (${grid.x.toFixed(1)}, ${grid.y.toFixed(1)})`,
        ]);
    }

    // Wird vom Player für jede Achse einzeln aufgerufen.
    // Aktuell: nur Außenwand-Check. Bald: Lookup in CollisionGrid.
    canMoveTo(screenX, screenY) {
        const grid = isoCenterToGrid(screenX, screenY, this.originX, this.originY);
        const margin = 0.3; // Player ist nicht punktförmig
        return grid.x >= margin
            && grid.x <= ISO.GRID_SIZE - margin
            && grid.y >= margin
            && grid.y <= ISO.GRID_SIZE - margin;
    }

    drawGrid() {
        const g = this.add.graphics();
        g.setDepth(0);
        for (let x = 0; x <= ISO.GRID_SIZE; x++) {
            for (let y = 0; y <= ISO.GRID_SIZE; y++) {
                const pos = gridToIso(x, y, this.originX, this.originY);
                drawIsoTile(g, pos.x, pos.y, ISO.TILE_SIZE, COLORS.GRID, 0, 0.4);
            }
        }
    }
}
