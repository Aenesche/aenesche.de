// src/scenes/GameScene.js

import { GAME, ISO, COLORS } from '../config/constants.js';
import { gridToIso, gridToIsoCenter, isoCenterToGrid, drawIsoTile } from '../utils/iso.js';
import Player from '../entities/Player.js';
import { createOuterWalls } from '../entities/OuterWalls.js';
import CollisionGrid from '../world/CollisionGrid.js';
import SeedTerminal from '../entities/stations/SeedTerminal.js';
import Bed from '../entities/stations/Bed.js';
import Register from '../entities/stations/Register.js';
import InteractionManager from '../world/InteractionManager.js';
import GameState from '../world/GameState.js';
import StorageTable from '../entities/stations/StorageTable.js';
import Door from '../entities/Door.js';
import { drawStreet } from '../world/Street.js';
import Customer from '../entities/Customer.js';
import CustomerManager from '../world/CustomerManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        this.originX = GAME.WIDTH / 2;
        this.originY = 140;

        this.collision = new CollisionGrid();
        this.state = new GameState();

        // Reihenfolge wichtig: erst Boden (depth -2000), dann Wände (-1000)
        this.drawGrid();
        drawStreet(this, this.originX, this.originY);
        this.walls = createOuterWalls(this, this.originX, this.originY);

        this.stations = [
            new SeedTerminal(this, 5, 1),
            new Bed(this, 3, 5),
            new Bed(this, 5, 5),
            new Bed(this, 7, 5),
            new Register(this, 5, 9),
            new StorageTable(this, 4, 9), // links neben Kasse
            new StorageTable(this, 6, 9), // rechts neben Kasse
        ];

        this.stations.forEach(s => {
            s.getTiles().forEach(t => this.collision.block(t.x, t.y));
        });

        this.door = new Door(this);
        // Customer-System. Wir geben die Klasse durch, damit der Manager
        // neue Kunden spawnen kann ohne selbst den Import zu brauchen.
        this.CustomerClass = Customer;
        const register = this.stations.find(s => s instanceof Register);
        this.customers = new CustomerManager(this, this.door, register, this.collision);

        const spawn = gridToIsoCenter(2, 7, this.originX, this.originY);
        this.player = new Player(this, spawn.x, spawn.y);

        this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');

        this.interaction = new InteractionManager(this, this.player, this.stations);

        this.debugText = this.add.text(20, 20, '', {
            font: '12px monospace',
            color: '#00ff88',
        });
        this.debugText.setDepth(300000);
        
        this.moneyText = this.add.text(GAME.WIDTH - 20, 20, '', {
            font: 'bold 18px monospace',
            color: '#00ff88',
        });
        this.moneyText.setOrigin(1, 0);
        this.moneyText.setDepth(300000);

        const updateMoney = () => this.moneyText.setText(`€ ${this.state.money}`);
        updateMoney();
        this.state.onChange(updateMoney);
    }
    
    update(time, delta) {
        let dirX = 0, dirY = 0;
        if (this.keys.A.isDown || this.keys.LEFT.isDown)  dirX = -1;
        if (this.keys.D.isDown || this.keys.RIGHT.isDown) dirX =  1;
        if (this.keys.W.isDown || this.keys.UP.isDown)    dirY = -1;
        if (this.keys.S.isDown || this.keys.DOWN.isDown)  dirY =  1;

        this.player.update(delta, dirX, dirY, (x, y) => this.canMoveTo(x, y));
        // Stations-Logik (Wachstum etc.)
        this.stations.forEach(s => {
            if (s.update) s.update(delta);
        });
        this.customers.update(delta);

        const px = this.player.x;
        const py = this.player.y;
        this.stations.forEach(s => s.updateOcclusion(px, py));
        this.walls.forEach(w => w.updateOcclusion(px, py));
        this.player.updateOcclusion(this.stations);

        this.interaction.update(delta);

        const grid = isoCenterToGrid(px, py, this.originX, this.originY);
        this.debugText.setText([
            'WEEDLE — Interaktion',
            'WASD bewegen, E interagieren (halten für Hold)',
            `grid: (${grid.x.toFixed(1)}, ${grid.y.toFixed(1)})`,
        ]);
    }

    canMoveTo(screenX, screenY) {
        const grid = isoCenterToGrid(screenX, screenY, this.originX, this.originY);
        return this.collision.canStandAt(grid.x, grid.y);
    }

    drawGrid() {
        const g = this.add.graphics();
        g.setDepth(-2000); // Ganz unten
        // Stärkere Linien als vorher (0.4 → 0.5) damit sie sichtbarer sind
        g.lineStyle(1, COLORS.GRID, 0.5);
        for (let x = 0; x <= ISO.GRID_SIZE; x++) {
            for (let y = 0; y <= ISO.GRID_SIZE; y++) {
                const pos = gridToIso(x, y, this.originX, this.originY);
                drawIsoTile(g, pos.x, pos.y, ISO.TILE_SIZE, COLORS.GRID, 0, 0.5);
            }
        }
    }
}
