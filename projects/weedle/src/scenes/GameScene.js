// Haupt-Scene. Wird von LevelSelect mit { levelConfig, saveData, user } gestartet.
// Baut das Level aus der Config (oder stellt es aus dem Save wieder her),
// trackt Ziele/Quests/Zeit über den GoalTracker und speichert automatisch.

import { GAME, ISO, COLORS, ITEMS, SEED_VARIETIES } from '../config/constants.js';
import { getLevel } from '../config/levels.js';
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
import UpgradeManager from '../world/UpgradeManager.js';
import JobBoard from '../world/JobBoard.js';
import Employee from '../entities/Employee.js';
import HiringStation from '../entities/stations/HiringStation.js';
import TrashCan from '../entities/stations/TrashCan.js';
import GoalTracker from '../world/GoalTracker.js';
import { SaveManager } from '../storage/SaveManager.js';
import { saveProgress, addUnlocks } from '../net/supabase.js';

const STATION_CLASSES = {
    SeedTerminal, Bed, Register, StorageTable, HiringStation, TrashCan,
};

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    init(data) {
        // Fallback auf Level 1, falls direkt gestartet (Dev)
        this.levelConfig = data?.levelConfig || getLevel(1);
        this.saveData = data?.saveData || null;
        this.user = data?.user || null;
    }

    create() {
        this.originX = GAME.WIDTH / 2;
        this.originY = 140;
        this.levelOver = false;

        this.collision = new CollisionGrid();
        this.state = new GameState({
            money: this.saveData?.money ?? this.levelConfig.startMoney,
            satisfaction: this.saveData?.satisfaction ?? 0,
        });
        this.jobBoard = new JobBoard();
        this.employees = [];
        this.employeeSpeedLevel = this.saveData?.employeeSpeedLevel || 0;
        this.goals = new GoalTracker(this.levelConfig, this.saveData?.goals || null);

        this.drawGrid();
        drawStreet(this, this.originX, this.originY);
        this.walls = createOuterWalls(this, this.originX, this.originY);

        // Stationen: aus Save wiederherstellen oder aus Level-Config bauen
        this.stations = [];
        if (this.saveData) {
            this.restoreStations(this.saveData.stations);
        } else {
            this.buildPrebuilt(this.levelConfig.prebuilt);
        }

        this.stations.forEach(s => {
            s.getTiles().forEach(t => this.collision.block(t.x, t.y));
        });

        this.door = new Door(this);

        // Build-System: nur erlaubte Typen dieses Levels
        this.buildManager = new BuildManager(this);
        this.buildManager.init(this.stations, this.levelConfig.allowedBuildTypes);

        // Player
        const spawn = this.getSpawnPosition();
        this.player = new Player(this, spawn.x, spawn.y);

        this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
        this.input.keyboard.addKey('R').on('down', () => {
            const p = this.getSpawnPosition();
            this.player.container.x = p.x;
            this.player.container.y = p.y;
        });
        this.input.keyboard.addKey('ESC').on('down', () => this.exitToLevelSelect());

        // Angestellte aus Save wiederherstellen (spawnen an der Hiring-Station)
        if (this.saveData?.employees) {
            for (const e of this.saveData.employees) {
                this.hireEmployee(e.role, true);
            }
        }

        this.CustomerClass = Customer;
        this.customers = null;
        this.tryInitCustomers();

        this.interaction = new InteractionManager(this, this.player, this.getInteractables());
        this.upgrades = new UpgradeManager(this, this.player);

        this.buildHUD();

        // Direkt beim Start einmal speichern (macht das Level zum "aktiven")
        this.autosaveAccum = 0;
        SaveManager.autosave(this, this.user?.id, true);
    }

    // --- Aufbau / Wiederherstellung ---

    buildPrebuilt(prebuilt) {
        for (const def of prebuilt) {
            const st = this.createStation(def.type, def.gridX, def.gridY, def.variety);
            if (st) this.stations.push(st);
        }
    }

    createStation(type, gridX, gridY, variety) {
        if (type === 'terminal') return new SeedTerminal(this, gridX, gridY, variety);
        if (type === 'bed') return new Bed(this, gridX, gridY);
        if (type === 'register') return new Register(this, gridX, gridY);
        if (type === 'storage') return new StorageTable(this, gridX, gridY);
        if (type === 'hiring') return new HiringStation(this, gridX, gridY);
        if (type === 'trash') return new TrashCan(this, gridX, gridY);
        return null;
    }

    restoreStations(list) {
        for (const s of list) {
            const Cls = STATION_CLASSES[s.cls];
            if (!Cls) continue;
            let st;
            if (s.cls === 'SeedTerminal') {
                st = new SeedTerminal(this, s.gridX, s.gridY, s.variety);
            } else {
                st = new Cls(this, s.gridX, s.gridY);
            }
            st.upgradeLevel = s.upgradeLevel || 0;
            if (s.cls === 'Bed') {
                st.tier = s.tier || 0;
                st.state = s.state || 'empty';
                st.stateTime = s.stateTime || 0;
                st.plantedVariety = s.plantedVariety
                    ? SEED_VARIETIES.find(v => v.id === s.plantedVariety) || null
                    : null;
            }
            if (s.cls === 'StorageTable' && Array.isArray(s.slots)) {
                st.slots = s.slots.map(id => id ? (ITEMS[id] || null) : null);
                // Slot-Anzahl an Upgrade-Level anpassen
                st.onUpgrade?.(st.upgradeLevel);
                st.drawItem();
            }
            if (s.cls === 'HiringStation') {
                this.employeeSpeedLevel = Math.max(this.employeeSpeedLevel, st.upgradeLevel);
            }
            this.stations.push(st);
        }
    }

    // --- Event-Hooks für den GoalTracker (von Stationen aufgerufen) ---

    reportSale(varietyId, price) { this.goals.onSale(varietyId, price); }
    reportRotten()               { this.goals.onRotten(); }
    reportRageQuit()             { this.goals.onRageQuit(); }
    reportDisposed()             { this.goals.onDisposed(); }

    // --- HUD ---

    buildHUD() {
        this.goalText = this.add.text(20, 16, '', {
            font: 'bold 14px monospace', color: '#00ff88',
        }).setDepth(300000);

        this.timerText = this.add.text(20, 38, '', {
            font: '13px monospace', color: '#00ffff',
        }).setDepth(300000);

        this.hintText = this.add.text(20, GAME.HEIGHT - 28,
            'WASD bewegen · E interagieren · Q upgraden · R Reset · ESC Menü', {
            font: '11px monospace', color: '#555',
        }).setDepth(300000);

        this.moneyText = this.add.text(GAME.WIDTH - 20, 16, '', {
            font: 'bold 18px monospace', color: '#00ff88',
        }).setOrigin(1, 0).setDepth(300000);

        this.satisfactionText = this.add.text(GAME.WIDTH - 20, 42, '', {
            font: 'bold 14px monospace', color: '#00ffff',
        }).setOrigin(1, 0).setDepth(300000);

        const updateHUD = () => {
            this.moneyText.setText(`€ ${this.state.money}`);
            const bar = '█'.repeat(this.state.satisfaction) + '░'.repeat(10 - this.state.satisfaction);
            this.satisfactionText.setText(bar);
        };
        updateHUD();
        this.state.onChange(updateHUD);
    }

    formatTime(ms) {
        const s = Math.floor(ms / 1000);
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }

    // --- Rest ---

    getInteractables() {
        return [...this.stations, ...this.buildManager.getInteractableSlots()];
    }

    tryInitCustomers() {
        if (this.customers) return;
        const registers = this.stations.filter(s => s instanceof Register);
        if (registers.length > 0) {
            this.customers = new CustomerManager(this, this.door, this.collision, this.state);
        }
    }

    onBuildSlotPurchased(slot) {
        let newStation;
        if (slot.type.startsWith('terminal_')) {
            newStation = new SeedTerminal(this, slot.gridX, slot.gridY, slot.type.replace('terminal_', ''));
        } else {
            newStation = this.createStation(slot.type, slot.gridX, slot.gridY);
        }

        if (newStation) {
            this.stations.push(newStation);
            newStation.getTiles().forEach(t => this.collision.block(t.x, t.y));
            this.pushPlayerOutOf(slot.gridX, slot.gridY);
        }

        this.goals.onBuild(slot.type);
        this.buildManager.onPurchased(slot);
        this.tryInitCustomers();
        this.interaction.stations = this.getInteractables();
        SaveManager.autosave(this, this.user?.id, true);
    }

    hireEmployee(role, fromSave = false) {
        const hiring = this.stations.find(s => s instanceof HiringStation);
        const gx = hiring ? hiring.gridX - 1 : 5;
        const gy = hiring ? hiring.gridY + 1 : 5;
        const emp = new Employee(this, gx, gy, role);
        this.employees.push(emp);
        if (!fromSave) {
            this.goals.onHire(role);
            SaveManager.autosave(this, this.user?.id, true);
        }
    }

    pushPlayerOutOf(gridX, gridY) {
        const tileCenter = gridToIsoCenter(gridX + 0.5, gridY + 0.5, this.originX, this.originY);
        let dx = this.player.container.x - tileCenter.x;
        let dy = this.player.container.y - tileCenter.y;
        const len = Math.hypot(dx, dy);
        if (len < 0.1) { dx = 0; dy = 1; }
        else { dx /= len; dy /= len; }

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
        if (this.levelOver) return;

        let dirX = 0, dirY = 0;
        if (this.keys.A.isDown || this.keys.LEFT.isDown)  dirX = -1;
        if (this.keys.D.isDown || this.keys.RIGHT.isDown) dirX =  1;
        if (this.keys.W.isDown || this.keys.UP.isDown)    dirY = -1;
        if (this.keys.S.isDown || this.keys.DOWN.isDown)  dirY =  1;

        this.player.update(delta, dirX, dirY, (x, y) => this.canMoveTo(x, y));

        this.stations.forEach(s => { if (s.update) s.update(delta); });
        this.buildManager.slots.forEach(s => { if (s.update) s.update(delta); });

        const px = this.player.x, py = this.player.y;
        this.stations.forEach(s => s.updateOcclusion(px, py));
        this.walls.forEach(w => w.updateOcclusion(px, py));
        this.player.updateOcclusion(this.stations);

        if (this.customers) this.customers.update(delta);
        this.interaction.update(delta);
        this.upgrades.update();
        this.employees.forEach(e => e.update(delta, this.jobBoard));

        // Ziel-Tracking
        this.goals.tick(delta);
        const overTime = this.goals.elapsedMs > this.levelConfig.timeLimitMs;
        this.goalText.setText(`ZIEL: ${this.goals.goalHudText()}`);
        this.timerText.setText(
            `⏱ ${this.formatTime(this.goals.elapsedMs)} / ${this.formatTime(this.levelConfig.timeLimitMs)}`
        );
        this.timerText.setColor(overTime ? '#ff6666' : '#00ffff');

        if (this.goals.allGoalsDone()) {
            this.completeLevel();
            return;
        }

        // Autosave
        this.autosaveAccum += delta;
        if (this.autosaveAccum > 5000) {
            this.autosaveAccum = 0;
            SaveManager.autosave(this, this.user?.id);
        }
    }

    completeLevel() {
        this.levelOver = true;
        this.goals.completed = true;
        const stars = this.goals.calcStars(this);
        const timeMs = Math.round(this.goals.elapsedMs);

        // Persistenz: Fortschritt + Unlocks speichern, aktiven Save löschen
        if (this.user) {
            saveProgress(this.user.id, this.levelConfig.id, stars, timeMs);
            addUnlocks(this.user.id, this.levelConfig.unlocks);
        }
        SaveManager.clear(this.user?.id);

        this.showCompletionOverlay(stars, timeMs);
    }

    showCompletionOverlay(stars, timeMs) {
        const cx = GAME.WIDTH / 2, cy = GAME.HEIGHT / 2;
        const overlay = this.add.container(0, 0).setDepth(500000);

        const dim = this.add.graphics();
        dim.fillStyle(0x000000, 0.8);
        dim.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
        overlay.add(dim);

        const box = this.add.graphics();
        box.fillStyle(0x0a0a0a, 1);
        box.fillRoundedRect(cx - 260, cy - 160, 520, 320, 10);
        box.lineStyle(2, 0x00ff88, 1);
        box.strokeRoundedRect(cx - 260, cy - 160, 520, 320, 10);
        overlay.add(box);

        overlay.add(this.add.text(cx, cy - 120, 'LEVEL GESCHAFFT!', {
            font: 'bold 26px monospace', color: '#00ff88',
        }).setOrigin(0.5));

        overlay.add(this.add.text(cx, cy - 70,
            '★'.repeat(stars) + '☆'.repeat(3 - stars), {
            font: '48px monospace', color: '#ffff00',
        }).setOrigin(0.5));

        overlay.add(this.add.text(cx, cy - 15, `Zeit: ${this.formatTime(timeMs)}`, {
            font: '15px monospace', color: '#00ffff',
        }).setOrigin(0.5));

        // Quest-Übersicht
        const questLines = this.levelConfig.quests.map(q =>
            `${this.goals.questDone(q, this) ? '✓' : '✗'} ${q.label}`
        ).join('\n');
        overlay.add(this.add.text(cx, cy + 35, questLines, {
            font: '13px monospace', color: '#aaa', align: 'center',
        }).setOrigin(0.5));

        // Unlock-Hinweis
        if (this.levelConfig.unlocks.length > 0) {
            overlay.add(this.add.text(cx, cy + 85, '🔓 Für Sandbox freigeschaltet!', {
                font: '13px monospace', color: '#ff00ff',
            }).setOrigin(0.5));
        }

        const btn = this.add.text(cx, cy + 125, '[ WEITER ]', {
            font: 'bold 20px monospace', color: '#00ff88',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => this.scene.start('LevelSelect', { user: this.user }));
        overlay.add(btn);
    }

    exitToLevelSelect() {
        if (this.levelOver) return;
        SaveManager.autosave(this, this.user?.id, true);
        this.scene.start('LevelSelect', { user: this.user });
    }

    canMoveTo(screenX, screenY) {
        const grid = isoCenterToGrid(screenX, screenY, this.originX, this.originY);
        return this.collision.canStandAt(grid.x, grid.y);
    }

    getSpawnPosition() {
        return gridToIsoCenter(this.door.gridX, this.door.gridY + 1, this.originX, this.originY);
    }

    drawGrid() {
        const g = this.add.graphics();
        g.setDepth(-2000);
        g.lineStyle(1, COLORS.GRID, 0.5);
        for (let x = 0; x <= ISO.GRID_SIZE; x++) {
            for (let y = 0; y <= ISO.GRID_SIZE; y++) {
                const pos = gridToIso(x, y, this.originX, this.originY);
                drawIsoTile(g, pos.x, pos.y, ISO.TILE_SIZE, COLORS.GRID, 0, 0.5);
            }
        }
    }
}
