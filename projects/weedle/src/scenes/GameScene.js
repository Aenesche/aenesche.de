// Haupt-Scene. Grid + Außenwände + Stationen + Player.
//
// Kollision läuft jetzt komplett über CollisionGrid:
//  - Außenwände → bounds-check in CollisionGrid (out-of-grid = blocked)
//  - Stationen → markieren ihre Tiles als blockiert
//  - Player → fragt via canMoveTo, das wiederum collision.canStandAt nutzt
//
// Iso-Depth-Sorting:
//  - Grid + Wände: depth = -1000 (immer hinten)
//  - Stationen: depth = ihr Footprint-Center-Y
//  - Player: depth = container.y, jedes Frame aktualisiert

import { GAME, ISO, COLORS } from '../config/constants.js';
import { gridToIso, gridToIsoCenter, isoCenterToGrid, drawIsoTile } from '../utils/iso.js';
import Player from '../entities/Player.js';
import { createOuterWalls } from '../entities/OuterWalls.js';
import CollisionGrid from '../world/CollisionGrid.js';
import SeedTerminal from '../entities/stations/SeedTerminal.js';
import Bed from '../entities/stations/Bed.js';
import Register from '../entities/stations/Register.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        this.originX = GAME.WIDTH / 2;
        this.originY = 140;

        this.collision = new CollisionGrid();

        this.drawGrid();
        this.walls = createOuterWalls(this, this.originX, this.originY);

        // Start-Setup nach Game-Logic-Doku: 1 Terminal, 3 Beete, 1 Kasse
        this.stations = [
            new SeedTerminal(this, 5, 1),
            new Bed(this, 3, 5),
            new Bed(this, 5, 5),
            new Bed(this, 7, 5),
            new Register(this, 5, 9),
        ];

        // Stationen-Tiles im CollisionGrid sperren
        this.stations.forEach(s => {
            s.getTiles().forEach(t => this.collision.block(t.x, t.y));
        });

        // Player auf einem freien Tile spawnen
        const spawn = gridToIsoCenter(2, 7, this.originX, this.originY);
        this.player = new Player(this, spawn.x, spawn.y);

        this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');

        // Debug HUD
        this.debugText = this.add.text(20, 20, '', {
            font: '12px monospace',
            color: '#00ff88',
        });
        this.debugText.setDepth(10000);
    }

    update(time, delta) {
        let dirX = 0, dirY = 0;
        if (this.keys.A.isDown || this.keys.LEFT.isDown)  dirX = -1;
        if (this.keys.D.isDown || this.keys.RIGHT.isDown) dirX =  1;
        if (this.keys.W.isDown || this.keys.UP.isDown)    dirY = -1;
        if (this.keys.S.isDown || this.keys.DOWN.isDown)  dirY =  1;

        this.player.update(delta, dirX, dirY, (x, y) => this.canMoveTo(x, y));

        // Occlusion: Stationen + Vorderwände werden transparent wenn Player dahinter.
        // Player wird transparent wenn er hinter Stationen läuft.
        const px = this.player.x;
        const py = this.player.y;
        this.stations.forEach(s => s.updateOcclusion(px, py));
        this.walls.forEach(w => w.updateOcclusion(px, py));
        this.player.updateOcclusion(this.stations);

        const grid = isoCenterToGrid(this.player.x, this.player.y, this.originX, this.originY);
        this.debugText.setText([
            'WEEDLE — Stationen + Kollision',
            'WASD / Pfeiltasten',
            `grid: (${grid.x.toFixed(1)}, ${grid.y.toFixed(1)})`,
        ]);
    }

    canMoveTo(screenX, screenY) {
        const grid = isoCenterToGrid(screenX, screenY, this.originX, this.originY);
        return this.collision.canStandAt(grid.x, grid.y);
    }

    drawGrid() {
        const g = this.add.graphics();
        g.setDepth(-1000);
        for (let x = 0; x <= ISO.GRID_SIZE; x++) {
            for (let y = 0; y <= ISO.GRID_SIZE; y++) {
                const pos = gridToIso(x, y, this.originX, this.originY);
                drawIsoTile(g, pos.x, pos.y, ISO.TILE_SIZE, COLORS.GRID, 0, 0.4);
            }
        }
    }
}
