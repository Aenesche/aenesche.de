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
import Door from '../entities/Door.js';
import { drawStreet } from '../world/Street.js';
import Customer from '../entities/Customer.js';
import CustomerManager from '../world/CustomerManager.js';
import BuildManager from '../world/BuildManager.js';
import StorageTable from '../entities/stations/StorageTable.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        this.originX = GAME.WIDTH / 2;
        this.originY = 140;

        this.collision = new CollisionGrid();
        this.state = new GameState();

        this.drawGrid();
        drawStreet(this, this.originX, this.originY);
        this.walls = createOuterWalls(this, this.originX, this.originY);

        // Start-Setup: nur 1 Samen-Terminal (gratis)
        this.stations = [
            new SeedTerminal(this, 5, 1),
        ];

        this.stations.forEach(s => {
            s.getTiles().forEach(t => this.collision.block(t.x, t.y));
        });

        this.door = new Door(this);

        // Build-System
        this.buildManager = new BuildManager(this);
        this.buildManager.init(this.stations);

        // Player
        const spawn = gridToIsoCenter(2, 7, this.originX, this.originY);
        this.player = new Player(this, spawn.x, spawn.y);

        this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
        // Notfall-Reset: R drücken wenn man feststeckt
        this.input.keyboard.addKey('R').on('down', () => {
            const spawn = gridToIsoCenter(2, 7, this.originX, this.originY);
            this.player.container.x = spawn.x;
            this.player.container.y = spawn.y;
        });

        // Customer-System: braucht mindestens 1 Register.
        // Wenn noch keins gebaut → customers wird null, kein Spawning.
        this.CustomerClass = Customer;
        this.customers = null;
        this.tryInitCustomers();

        // Interaction: Stationen + sichtbare BuildSlots
        this.interaction = new InteractionManager(this, this.player, this.getInteractables());

        // HUD
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

        this.satisfactionText = this.add.text(GAME.WIDTH - 20, 45, '', {
            font: 'bold 14px monospace',
            color: '#00ffff',
        });
        this.satisfactionText.setOrigin(1, 0);
        this.satisfactionText.setDepth(300000);

        const updateHUD = () => {
            this.moneyText.setText(`€ ${this.state.money}`);
            const bar = '█'.repeat(this.state.satisfaction) + '░'.repeat(10 - this.state.satisfaction);
            this.satisfactionText.setText(`${bar}`);
        };
        updateHUD();
        this.state.onChange(updateHUD);
        // Debug: rotes Kreuz das zeigt wo das Spiel denkt dass der Player-Fuß ist
        this.debugMarker = this.add.graphics();
        this.debugMarker.setDepth(999999);
    }

    // Alle interagierbaren Objekte (Stationen + sichtbare BuildSlots)
    getInteractables() {
        return [
            ...this.stations,
            ...this.buildManager.getInteractableSlots(),
        ];
    }

    // Kunden-System startet erst wenn mindestens 1 Register existiert
    tryInitCustomers() {
        if (this.customers) return;
        const register = this.stations.find(s => s instanceof Register);
        if (register) {
            this.customers = new CustomerManager(this, this.door, register, this.collision, this.state);
        }
    }

    // Callback von BuildSlot wenn gekauft
    onBuildSlotPurchased(slot) {
        let newStation;
        if (slot.type === 'bed') {
            newStation = new Bed(this, slot.gridX, slot.gridY);
        } else if (slot.type === 'register') {
            newStation = new Register(this, slot.gridX, slot.gridY);
        } else if (slot.type === 'storage') {
            newStation = new StorageTable(this, slot.gridX, slot.gridY);
        }

        if (newStation) {
            this.stations.push(newStation);
            newStation.getTiles().forEach(t => this.collision.block(t.x, t.y));

            // Eingemauert-Schutz: Player aus dem Tile rausschieben wenn er drinsteht
            this.pushPlayerOutOf(slot.gridX, slot.gridY);
        }

        this.buildManager.onPurchased(slot);
        this.tryInitCustomers();
        this.interaction.stations = this.getInteractables();
    }

    // Schiebt den Player auf das nächste freie Nachbar-Tile
    pushPlayerOutOf(gridX, gridY) {
        // Richtung: vom blockierten Tile-Center weg
        const tileCenter = gridToIsoCenter(gridX + 0.5, gridY + 0.5, this.originX, this.originY);
        let dx = this.player.container.x - tileCenter.x;
        let dy = this.player.container.y - tileCenter.y;
        const len = Math.hypot(dx, dy);
        if (len < 0.1) { dx = 0; dy = 1; } // Fallback: nach unten
        else { dx /= len; dy /= len; }

        // Pixel für Pixel rausschieben bis frei
        for (let i = 1; i < 200; i++) {
            const testX = this.player.container.x + dx * i;
            const testY = this.player.container.y + dy * i;
            if (this.canMoveTo(testX, testY)) {
                this.player.container.x = testX;
                this.player.container.y = testY;
                return;
            }
        }
    }
    
    update(time, delta) {
        let dirX = 0, dirY = 0;
        if (this.keys.A.isDown || this.keys.LEFT.isDown)  dirX = -1;
        if (this.keys.D.isDown || this.keys.RIGHT.isDown) dirX =  1;
        if (this.keys.W.isDown || this.keys.UP.isDown)    dirY = -1;
        if (this.keys.S.isDown || this.keys.DOWN.isDown)  dirY =  1;

        this.player.update(delta, dirX, dirY, (x, y) => this.canMoveTo(x, y));

        // Stations-Updates (Wachstum etc.)
        this.stations.forEach(s => { if (s.update) s.update(delta); });

        // BuildSlot-Animationen
        this.buildManager.slots.forEach(s => { if (s.update) s.update(delta); });

        // Occlusion
        const px = this.player.x;
        const py = this.player.y;
        const fpx = this.player.footX;
        const fpy = this.player.footY;

        this.stations.forEach(s => s.updateOcclusion(px, py));
        this.walls.forEach(w => w.updateOcclusion(px, py));
        this.player.updateOcclusion(this.stations);

        if (this.customers) this.customers.update(delta);
        this.interaction.update(delta);

        const grid = isoCenterToGrid(fpx, fpy, this.originX, this.originY);
        this.debugText.setText([
            'WEEDLE — Build-System',
            'WASD bewegen, E interagieren, R = Reset',
            `grid: (${grid.x.toFixed(1)}, ${grid.y.toFixed(1)})`,
        ]);
        // Debug-Marker: wo denkt das Spiel dass der Player steht?
        this.debugMarker.clear();
        this.debugMarker.lineStyle(2, 0xff0000, 1);
        const debugPos = gridToIsoCenter(Math.floor(grid.x) + 0.5, Math.floor(grid.y) + 0.5, this.originX, this.originY);
        // Rotes X auf dem Tile wo der Player laut Grid steht
        this.debugMarker.beginPath(); this.debugMarker.moveTo(debugPos.x - 8, debugPos.y - 8); this.debugMarker.lineTo(debugPos.x + 8, debugPos.y + 8); this.debugMarker.strokePath();
        this.debugMarker.beginPath(); this.debugMarker.moveTo(debugPos.x + 8, debugPos.y - 8); this.debugMarker.lineTo(debugPos.x - 8, debugPos.y + 8); this.debugMarker.strokePath();
        // Grüner Punkt wo der Player WIRKLICH ist (Fuß-Position)
        this.debugMarker.fillStyle(0x00ff00, 1);
        this.debugMarker.fillCircle(this.player.footX, this.player.footY, 4);
        // Gelber Punkt: Container-Position
        this.debugMarker.fillStyle(0xffff00, 1);
        this.debugMarker.fillCircle(this.player.x, this.player.y, 3);
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
