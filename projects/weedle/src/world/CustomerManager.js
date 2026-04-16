import { CUSTOMER, SATISFACTION, SPAWN, ITEMS } from '../config/constants.js';
import { findPath } from './Pathfinding.js';

export default class CustomerManager {
    constructor(scene, door, register, collision, state) {
        this.scene = scene;
        this.door = door;
        this.register = register;
        this.collision = collision;
        this.state = state;

        this.customers = [];
        this.spawnCooldown = this.currentSpawnInterval();
    }

    update(delta) {
        this.spawnCooldown -= delta;
        if (this.customers.length < this.currentMaxCustomers() && this.spawnCooldown <= 0) {
            this.trySpawn();
            this.spawnCooldown = this.currentSpawnInterval();
        }

        for (const c of this.customers) {
            c.update(delta);

            // State-Übergänge
            if (c.state === 'served') {
                c.servedTime = (c.servedTime ?? 0) + delta;
                if (c.servedTime >= CUSTOMER.WAIT_AFTER_SERVED) {
                    this.sendToExit(c);
                    c.state = 'leaving';
                }
            }
            if (c.state === 'rage_leaving' && !c._rageProcessed) {
                c._rageProcessed = true;
                this.state.adjustSatisfaction(SATISFACTION.RAGE_QUIT);
                this.sendToExit(c);
            }
        }

        // Queue-Logik: vorderster Kunde aktiviert seinen Rage-Timer
        this.updateQueue();

        // Fertige entfernen
        this.customers = this.customers.filter(c => {
            if (c.state === 'done') {
                c.destroy();
                return false;
            }
            return true;
        });
    }

    // Max-Kunden linear abhängig von Zufriedenheit
    currentMaxCustomers() {
        const r = this.state.satisfactionRatio;
        const v = SPAWN.MAX_CUSTOMERS_LOW + (SPAWN.MAX_CUSTOMERS_HIGH - SPAWN.MAX_CUSTOMERS_LOW) * r;
        return Math.max(1, Math.round(v));
    }

    // Spawn-Intervall invers zur Zufriedenheit: hohe Zufr. = häufiger
    currentSpawnInterval() {
        const r = this.state.satisfactionRatio;
        return SPAWN.INTERVAL_MAX - (SPAWN.INTERVAL_MAX - SPAWN.INTERVAL_MIN) * r;
    }

    // Bestellung generieren. Meistens 1 Item, bei hoher Zufriedenheit öfter mehrere.
    generateOrder() {
        const r = this.state.satisfactionRatio;
        const multiChance = Math.max(0, this.state.satisfaction - SATISFACTION.START) * SPAWN.MULTI_ITEM_CHANCE_PER_SAT;

        let size = 1;
        for (let i = 0; i < SPAWN.MAX_ORDER_SIZE - 1; i++) {
            if (Math.random() < multiChance) size++;
            else break;
        }

        // Für jetzt: nur Plant verfügbar (später weitere Sorten)
        return Array.from({ length: size }, () => ITEMS.PLANT.id);
    }

    trySpawn() {
        const Customer = this.scene.CustomerClass;
        const spawn = { x: this.door.gridX, y: this.door.gridY + 1 };

        // Nächsten freien Slot suchen
        const slotIndex = this.customers.length;
        const target = this.getQueueSlot(slotIndex);

        const path = findPath(this.collision, { x: spawn.x, y: spawn.y - 1 }, target);
        if (!path) return;

        const order = this.generateOrder();
        const c = new Customer(this.scene, spawn.x, spawn.y, order);

        const fullPath = [{ x: spawn.x, y: spawn.y - 1 }, ...path];
        c.setPath(fullPath);
        this.customers.push(c);
    }

    getQueueSlot(n) {
        return {
            x: this.register.gridX,
            y: this.register.gridY + 1 + n * CUSTOMER.QUEUE_SPACING,
        };
    }

    // Vorderster wartender Kunde bekommt Rage-Timer aktiviert sobald er angekommen ist
    updateQueue() {
        const queueing = this.customers.filter(c =>
            c.state === 'queueing' || c.state === 'waiting'
        );
        for (let i = 0; i < queueing.length; i++) {
            const c = queueing[i];
            if (i === 0 && this.isAtSlot(c, 0)) {
                c.rageActive = true;
            } else {
                c.rageActive = false;
                // Hintere Kunden rücken nach wenn Platz frei
                if (c.state === 'queueing' && !this.isAtSlot(c, i)) {
                    this.assignSlot(c, i);
                }
            }
        }
    }

    // Kunde dem Slot i zuweisen (neuer Pfad)
    assignSlot(customer, slotIndex) {
        const slot = this.getQueueSlot(slotIndex);
        const from = customer.gridPos;
        const path = findPath(this.collision, from, slot);
        if (path) customer.setPath(path);
    }

    getActiveCustomer() {
        // Vorderster wartender Kunde am Register
        return this.customers.find(c =>
            (c.state === 'queueing' || c.state === 'waiting') && this.isAtSlot(c, 0)
        );
    }

    isAtSlot(customer, n) {
        const slot = this.getQueueSlot(n);
        const pos = customer.gridPos;
        return Math.abs(pos.x - slot.x) < 0.5 && Math.abs(pos.y - slot.y) < 0.5;
    }

    // Satisfaction-Bonus beim erfolgreichen Bedienen
    onCustomerServed(customer) {
        const fast = customer.rageRatio < CUSTOMER.FAST_SERVE_THRESHOLD;
        const delta = fast ? SATISFACTION.FAST_SERVE : SATISFACTION.NORMAL_SERVE;
        if (delta !== 0) this.state.adjustSatisfaction(delta);
    }

    sendToExit(customer) {
        const from = customer.gridPos;
        const exitOutside = { x: this.door.gridX, y: this.door.gridY + 1 };
        const path = findPath(this.collision, from, { x: this.door.gridX, y: this.door.gridY - 1 });
        if (path) {
            path.push(exitOutside);
            customer.setPath(path);
        } else {
            customer.state = 'done';
        }
    }
}
