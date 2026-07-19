// Angestellter: sieht aus wie Player/Customer, hat Neon-Hut.
// Bewegt sich per A*-Pathfinding, führt Jobs vom JobBoard aus.
// Rolle: 'gardener' oder 'cashier'.

import { COLORS, ISO, EMPLOYEE, ITEMS, SEED_VARIETIES } from '../config/constants.js';
import { gridToIsoCenter, isoCenterToGrid } from '../utils/iso.js';
import { findPath } from '../world/Pathfinding.js';
import CarriedItem from './CarriedItem.js';

const ROLE_COLORS = {
    gardener: 0x00ff00,
    cashier:  0x0088ff,
};

const HAT_COLORS = {
    gardener: 0x00ff88,
    cashier:  0x00ccff,
};

export default class Employee {
    constructor(scene, gridX, gridY, role) {
        this.scene = scene;
        this.role = role;
        this.id = `emp_${role}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

        this.state = 'idle';       // idle | walking | interacting | hold_interact
        this.currentJob = null;
        this.path = null;
        this.pathIndex = 0;
        this.holdTimer = 0;
        this.carriedItem = null;
        this.idleCooldown = 0;

        const color = ROLE_COLORS[role];
        const spawn = gridToIsoCenter(gridX, gridY, scene.originX, scene.originY);
        this.container = scene.add.container(spawn.x, spawn.y);
        this.container.setDepth(spawn.y);

        // Body (wie Player/Customer)
        const body = scene.add.graphics();
        body.fillStyle(color, 0.2);
        body.fillEllipse(0, 0, 24, 12);
        body.lineStyle(2, color, 1);
        body.strokeRect(-12, -24, 24, 24);
        body.fillStyle(color, 0.2);
        body.fillRect(-12, -24, 24, 24);
        body.fillStyle(color, 1);
        body.fillRect(-6, -14, 4, 4);
        body.fillRect(2, -14, 4, 4);
        this.container.add(body);

        // Neon-Hut
        const hat = scene.add.graphics();
        const hatColor = HAT_COLORS[role];
        hat.fillStyle(hatColor, 0.8);
        hat.fillTriangle(-8, -24, 8, -24, 0, -34);
        hat.lineStyle(1, hatColor, 1);
        hat.strokeTriangle(-8, -24, 8, -24, 0, -34);
        this.container.add(hat);
    }

    get x() { return this.container.x; }
    get y() { return this.container.y; }
    get gridPos() {
        return isoCenterToGrid(this.container.x, this.container.y, this.scene.originX, this.scene.originY);
    }

    hasItem() { return this.carriedItem !== null; }

    pickUp(carriedItem) {
        if (this.hasItem()) return false;
        this.carriedItem = carriedItem;
        carriedItem.graphics.setPosition(0, -38);
        this.container.add(carriedItem.graphics);
        return true;
    }

    dropItem() {
        if (!this.carriedItem) return null;
        const item = this.carriedItem;
        this.container.remove(item.graphics);
        item.destroy();
        this.carriedItem = null;
        return item.itemDef;
    }

    update(delta, jobBoard) {
        this.container.setDepth(this.container.y);

        // Job-Validierung: ist der aktuelle Job noch gültig?
        if (this.currentJob && !this.isJobStillValid()) {
            this.abandonJob();
            return;
        }

        if (this.state === 'walking') {
            this.followPath(delta);
            return;
        }

        //

        if (this.state === 'hold_interact') {
            this.holdTimer -= delta;
            if (this.holdTimer <= 0) {
                this.executeJobAction();
            }
            return;
        }

        // idle → neuen Job suchen
        if (this.state === 'idle') {
            this.idleCooldown -= delta;
            if (this.idleCooldown > 0) return;
            this.idleCooldown = 500; // nicht jedes Frame suchen

            this.findAndClaimJob(jobBoard);
        }
    }

    findAndClaimJob(jobBoard) {
        const jobs = this.role === 'gardener'
            ? jobBoard.getGardenerJobs(this.scene)
            : jobBoard.getCashierJobs(this.scene);

        if (jobs.length === 0) return;

        // Filtere Jobs basierend auf aktuellem Zustand
        const viable = this.filterViableJobs(jobs);
        if (viable.length === 0) return;

        // Sortiere nach Priorität (höher = dringender), dann Distanz
        viable.sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return this.distanceTo(a.target) - this.distanceTo(b.target);
        });

        const job = viable[0];
        if (jobBoard.claim(job, this)) {
            this.currentJob = job;
            this.walkToTarget(job);
        }
    }

    filterViableJobs(jobs) {
        return jobs.filter(job => {
            if (job.type === 'buy_seed') return !this.hasItem();
            if (job.type === 'plant_seed') return this.hasItem() && this.carriedItem.itemDef.id.startsWith('seed_');
            if (job.type === 'harvest') return !this.hasItem();
            if (job.type === 'clear_rotten') return !this.hasItem();
            if (job.type === 'store_item') return this.hasItem();
            if (job.type === 'take_order') return !this.hasItem();
            if (job.type === 'deliver_item') {
                // Phase 1: Item holen (braucht leere Hände)
                // Phase 2: Item zum Kunden bringen (hat schon Item)
                return !this.hasItem() || (this.hasItem() && this.carriedItem.itemDef.id.startsWith('plant_'));
            }
            return true;
        });
    }

    distanceTo(target) {
        const pos = this.gridPos;
        return Math.hypot(target.gridX - pos.x, target.gridY - pos.y);
    }

    walkToTarget(job) {
        const target = job.type === 'deliver_item' && !this.hasItem()
            ? job.target  // erst zum Tisch
            : (job.type === 'deliver_item' && this.hasItem()
                ? job.register  // dann zur Kasse
                : job.target);

        const from = this.gridPos;
        const to = { x: target.gridX, y: target.gridY };

        // Ziel ist blockiert (Station), also zum Nachbar
        const path = findPath(this.scene.collision, from, to);
        if (!path || path.length === 0) {
            this.abandonJob();
            return;
        }

        this.path = path;
        this.pathIndex = 0;
        this.state = 'walking';
    }

    followPath(delta) {
        if (!this.path || this.pathIndex >= this.path.length) {
            this.onArrived();
            return;
        }

        const target = this.path[this.pathIndex];
        const targetScreen = gridToIsoCenter(target.x, target.y, this.scene.originX, this.scene.originY);
        const dx = targetScreen.x - this.container.x;
        const dy = targetScreen.y - this.container.y;
        const dist = Math.hypot(dx, dy);
        const speed = this.getSpeed();
        const step = (speed * delta) / 1000;

        if (dist <= step) {
            this.container.x = targetScreen.x;
            this.container.y = targetScreen.y;
            this.pathIndex++;
        } else {
            this.container.x += (dx / dist) * step;
            this.container.y += (dy / dist) * step;
        }
    }

    onArrived() {
        if (!this.currentJob) {
            this.state = 'idle';
            return;
        }

        const job = this.currentJob;

        // Hold-Interaktionen brauchen Timer
        if (job.type === 'buy_seed' || job.type === 'take_order') {
            this.state = 'hold_interact';
            this.holdTimer = EMPLOYEE.HOLD_DURATION;
            return;
        }

        // Deliver: zwei Phasen — erst Tisch (aufheben), dann Kasse (abgeben)
        if (job.type === 'deliver_item' && !this.hasItem()) {
            this.pickUpFromStorage(job);
            return;
        }

        // Sofort-Aktionen
        this.executeJobAction();
    }

    pickUpFromStorage(job) {
        const st = job.target;
        const itemDef = st.slots[job.slotIndex];
        if (!itemDef) {
            this.abandonJob();
            return;
        }
        st.slots[job.slotIndex] = null;
        st.drawItem();
        const carried = new CarriedItem(this.scene, itemDef);
        this.pickUp(carried);
        // Jetzt zur Kasse laufen
        this.walkToTarget(job);
    }

    executeJobAction() {
        const job = this.currentJob;
        if (!job) { this.state = 'idle'; return; }

        switch (job.type) {
            case 'buy_seed':
                const variety = job.target.variety;
                const seedItem = ITEMS[`seed_${variety.id}`];
                if (seedItem && this.scene.state.spend(variety.seedCost)) {
                    const seed = new CarriedItem(this.scene, seedItem);
                    this.pickUp(seed);
                }
                break;

            case 'plant_seed':
                if (job.target.state === 'empty' && this.hasItem()) {
                    const itemDef = this.carriedItem.itemDef;
                    const variety = SEED_VARIETIES.find(v => v.id === itemDef.variety);
                    if (variety && job.target.canPlant(variety)) {
                        this.dropItem();
                        job.target.plantedVariety = variety;
                        job.target.state = 'growing';
                        job.target.stateTime = 0;
                    }
                }
                break;

            case 'harvest':
                if (job.target.state === 'ready' && !this.hasItem() && job.target.plantedVariety) {
                    const plantItem = ITEMS[`plant_${job.target.plantedVariety.id}`];
                    const plant = new CarriedItem(this.scene, plantItem);
                    this.pickUp(plant);
                    job.target.state = 'empty';
                    job.target.stateTime = 0;
                    job.target.plantedVariety = null;
                    job.target.plantGfx.clear();
                }
                break;

            case 'clear_rotten':
                if (job.target.state === 'rotten') {
                    job.target.state = 'empty';
                    job.target.stateTime = 0;
                    job.target.plantGfx.clear();
                }
                break;

            case 'store_item':
                if (this.hasItem() && job.target.freeSlots > 0) {
                    const itemDef = this.dropItem();
                    const freeIdx = job.target.slots.indexOf(null);
                    job.target.slots[freeIdx] = itemDef;
                    job.target.drawItem();
                }
                break;

            case 'take_order':
                if (job.customer && !job.customer.orderRevealed) {
                    job.customer.revealOrder();
                    job.customer.state = 'waiting';
                }
                break;

            case 'deliver_item':
                if (this.hasItem() && job.customer && job.customer.order.length > 0) {
                    const itemDef = this.carriedItem.itemDef;
                    if (job.customer.receiveItem(itemDef)) {
                        this.dropItem();
                        if (itemDef.sellPrice) {
                            const terminal = this.scene.stations.find(s =>
                                s.constructor.name === 'SeedTerminal' && s.variety?.id === itemDef.variety
                            );
                            const mult = terminal ? (1 + (terminal.upgradeLevel || 0) * 0.25) : 1;
                            this.scene.state.earn(Math.round(itemDef.sellPrice * mult));
                        }
                        if (job.customer.order.length === 0) {
                            this.scene.customers.onCustomerServed(job.customer);
                        }
                    }
                }
                break;
        }

        this.completeJob();
    }

    completeJob() {
        if (this.currentJob) {
            this.scene.jobBoard.complete(this.currentJob);
        }
        this.currentJob = null;
        this.state = 'idle';
        this.idleCooldown = 300;
    }

    abandonJob() {
        if (this.currentJob) {
            this.scene.jobBoard.abandon(this.currentJob);
        }
        this.currentJob = null;
        this.state = 'idle';
        this.idleCooldown = 500;

        // Item loswerden: auf nächsten freien Tisch legen oder droppen
        if (this.hasItem()) {
            const storages = this.scene.stations.filter(s => s.constructor.name === 'StorageTable');
            const free = storages.find(s => s.freeSlots > 0);
            if (free) {
                // Neuen Store-Job claimen und hinlaufen
                const job = {
                    type: 'store_item',
                    target: free,
                    targetId: `store_${free.gridX}_${free.gridY}_recovery`,
                    priority: 10,
                };
                if (this.scene.jobBoard.claim(job, this)) {
                    this.currentJob = job;
                    this.walkToTarget(job);
                    return;
                }
            }
            // Kein freier Tisch: Item einfach zerstören (Notfall)
            this.dropItem();
        }
    }

    destroy() {
        if (this.carriedItem) {
            this.carriedItem.destroy();
        }
        this.scene.jobBoard.releaseAll(this);
        this.container.destroy();
    }
    
    getSpeed() {
        const level = this.scene.employeeSpeedLevel || 0;
        return Math.min(
            EMPLOYEE.SPEED_BASE + level * EMPLOYEE.SPEED_PER_LEVEL,
            EMPLOYEE.SPEED_MAX
        );
    }
    isJobStillValid() {
        const job = this.currentJob;
        if (!job) return false;

        // Kunde noch da und noch wartend?
        if (job.customer) {
            if (job.customer.state === 'done' ||
                job.customer.state === 'leaving' ||
                job.customer.state === 'rage_leaving') {
                return false;
            }
        }

        // Bestellung aufnehmen: Kunde noch nicht bestellt?
        if (job.type === 'take_order' && job.customer?.orderRevealed) {
            return false;
        }

        // Deliver: Item noch auf dem Tisch?
        if (job.type === 'deliver_item' && !this.hasItem()) {
            if (!job.target.slots[job.slotIndex]) {
                return false;
            }
        }

        // Harvest: Beet noch erntereif?
        if (job.type === 'harvest' && job.target.state !== 'ready') {
            return false;
        }

        // Plant: Beet noch leer?
        if (job.type === 'plant_seed' && job.target.state !== 'empty') {
            return false;
        }

        // Clear rotten: Beet noch verfault?
        if (job.type === 'clear_rotten' && job.target.state !== 'rotten') {
            return false;
        }

        // Store: Tisch noch frei?
        if (job.type === 'store_item' && job.target.freeSlots <= 0) {
            return false;
        }

        return true;
    }
}
