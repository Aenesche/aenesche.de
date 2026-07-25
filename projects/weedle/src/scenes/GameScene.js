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
import { Audio } from '../audio/AudioManager.js';
import DialogueBox from '../entities/DialogueBox.js';
import SettingsPanel from '../ui/SettingsPanel.js';
import { getDialogue } from '../config/dialogues.js';

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
        this.input.keyboard.addKey('ESC').on('down', () => this.onEsc());

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

        // Audio: Browser verlangt eine User-Geste, bevor Ton laufen darf
        const unlockAudio = () => { Audio.unlock(); Audio.startMusic(); };
        this.input.once('pointerdown', unlockAudio);
        this.input.keyboard.once('keydown', unlockAudio);
        Audio.unlock(); Audio.startMusic(); // falls schon entsperrt (Menü)

        this.dialogue = new DialogueBox(this);
        this.settings = new SettingsPanel(this, () => { this.paused = this.pauseOpen; });
        this.paused = false;
        this.pauseOpen = false;

        // Level-Intro nur beim frischen Start, nicht beim Fortsetzen
        if (!this.saveData) {
            const lines = getDialogue(this.levelConfig.id);
            if (lines) {
                this.paused = true;
                this.dialogue.show(lines, () => { this.paused = false; });
            }
        }

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

        Audio.play('build');
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
            Audio.play('upgrade');
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
        // Dialog, Pause-Menü oder Einstellungen offen → Spiel steht still
        if (this.paused || this.dialogue?.active || this.settings?.visible) return;

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
        this.applySoftPush();

        // Ziel-Tracking (im Freeplay nur Zeit mitlaufen lassen, kein Ziel/Limit)
        this.goals.tick(delta);

        if (this.levelConfig.freeplay) {
            this.goalText.setText('FREEPLAY');
            this.timerText.setText(`⏱ ${this.formatTime(this.goals.elapsedMs)} gespielt`);
            this.timerText.setColor('#00ffff');
        } else {
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
        Audio.play('levelComplete');
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

    onEsc() {
        if (this.levelOver) return;
        if (this.settings?.visible) { this.settings.hide(); return; }
        if (this.dialogue?.active) return;   // Intro nicht wegdrücken
        this.togglePause();
    }

    togglePause() {
        if (this.pauseOpen) { this.closePause(); return; }

        this.pauseOpen = true;
        this.paused = true;
        Audio.play('uiClick');

        const cx = GAME.WIDTH / 2, cy = GAME.HEIGHT / 2;
        const c = this.add.container(0, 0).setDepth(650000);

        const dim = this.add.graphics();
        dim.fillStyle(0x000000, 0.72);
        dim.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
        c.add(dim);

        const w = 340, h = 230;
        const box = this.add.graphics();
        box.fillStyle(0x060d0c, 0.97);
        box.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 8);
        box.lineStyle(2, 0x00ffff, 0.7);
        box.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 8);
        c.add(box);

        c.add(this.add.text(cx, cy - h / 2 + 22, 'PAUSE', {
            font: 'bold 20px monospace', color: '#00ffff',
        }).setOrigin(0.5, 0));

        const mkBtn = (label, dy, color, fn) => {
            const t = this.add.text(cx, cy + dy, label, {
                font: 'bold 15px monospace', color,
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            t.on('pointerover', () => t.setScale(1.08));
            t.on('pointerout', () => t.setScale(1));
            t.on('pointerdown', () => { Audio.play('uiClick'); fn(); });
            c.add(t);
        };

        mkBtn('[ WEITER ]', -30, '#00ff88', () => this.closePause());
        mkBtn('[ EINSTELLUNGEN ]', 12, '#00ffff', () => this.settings.show());
        mkBtn('[ LEVEL VERLASSEN ]', 54, '#ff8866', () => {
            this.closePause();
            this.exitToLevelSelect();
        });
        c.add(this.add.text(cx, cy + h / 2 - 26, 'Fortschritt wird gespeichert', {
            font: '10px monospace', color: '#5a8a80',
        }).setOrigin(0.5));

        this.pauseOverlay = c;
    }

    closePause() {
        this.pauseOpen = false;
        this.paused = false;
        this.pauseOverlay?.destroy();
        this.pauseOverlay = null;
    }

    exitToLevelSelect() {
        if (this.levelOver) return;
        SaveManager.autosave(this, this.user?.id, true);
        this.scene.start('LevelSelect', { user: this.user });
    }

    // Sanftes "Force-Field" um den Player: Kunden und Angestellte werden
    // beim Durchlaufen ein Stück beiseite geschoben, statt dass man durch sie
    // hindurchgeht. NPCs auf einem Pfad korrigieren sich danach von selbst,
    // wartende Kunden driften zu ihrer Ruheposition zurück.
    applySoftPush() {
        const RADIUS = 26;      // Screen-Pixel bis zur Berührung
        const STRENGTH = 0.35;  // wie hart geschoben wird

        const targets = [
            ...this.employees,
            ...(this.customers ? this.customers.customers : []),
        ];

        const px = this.player.x;
        const py = this.player.y;

        for (const t of targets) {
            const c = t.container;
            if (!c) continue;

            const dx = c.x - px;
            // Iso: die y-Achse ist auf dem Schirm halb so hoch → für einen
            // runden Wirkungsbereich in Weltkoordinaten hochskalieren.
            const dy = (c.y - py) * 2;
            const dist = Math.hypot(dx, dy);
            if (dist >= RADIUS || dist < 0.001) continue;

            const push = (RADIUS - dist) * STRENGTH;
            const nx = c.x + (dx / dist) * push;
            const ny = c.y + (dy / dist) * push * 0.5;

            // Nicht in Wände oder Stationen schieben
            const g = isoCenterToGrid(nx, ny, this.originX, this.originY);
            if (this.collision.canStandAt(g.x, g.y, 0.2)) {
                c.x = nx;
                c.y = ny;
                c.setDepth(c.y);
            }
        }
    }

    canMoveTo(screenX, screenY) {
        const grid = isoCenterToGrid(screenX, screenY, this.originX, this.originY);
        return this.collision.canStandAt(grid.x, grid.y);
    }

    getSpawnPosition() {
        return gridToIsoCenter(this.door.gridX, this.door.gridY + 1, this.originX, this.originY);
    }

    // Boden als TEXTUR statt Live-Graphics: umgeht Phaser-Graphics-Batching-Bugs
    // (Grid verschwand sporadisch) und rendert schneller.
    drawGrid() {
        const N = ISO.GRID_SIZE, T = ISO.TILE_SIZE;
        const key = 'floorGrid';
        if (this.textures.exists(key)) this.textures.remove(key);

        // Bounding-Box des Grids: Diamonds ragen ±T um ihre Spitze
        const offX = (N + 1) * T + 2;
        const w = 2 * (N + 1) * T + 4;
        const h = (N + 1) * T + 4;

        const g = this.make.graphics({ x: 0, y: 0, add: false });
        for (let x = 0; x <= N; x++) {
            for (let y = 0; y <= N; y++) {
                const px = offX + (x - y) * T;
                const py = 2 + (x + y) * (T / 2);
                drawIsoTile(g, px, py, T, COLORS.GRID, 0, 0.5);
            }
        }
        g.generateTexture(key, w, h);
        g.destroy();

        this.add.image(this.originX - offX, this.originY - 2, key)
            .setOrigin(0, 0)
            .setDepth(-2000);
    }
}
