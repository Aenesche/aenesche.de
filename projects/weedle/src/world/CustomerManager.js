// Spawnt Kunden, verwaltet Warteschlange vor der Kasse, gibt ihnen Pfade.
// Aktuell: 1 Kunde gleichzeitig (zum Testen). Später: via Upgrade mehr.

import { CUSTOMER } from '../config/constants.js';
import { findPath } from './Pathfinding.js';

const MAX_CUSTOMERS = 1;
const SPAWN_INTERVAL = 2000; // ms zwischen Versuchen einen neuen zu spawnen

export default class CustomerManager {
    constructor(scene, door, register, collision) {
        this.scene = scene;
        this.door = door;
        this.register = register;
        this.collision = collision;

        this.customers = [];
        this.spawnCooldown = 0;
    }

    update(delta) {
        // Spawnen wenn Platz
        this.spawnCooldown -= delta;
        if (this.customers.length < MAX_CUSTOMERS && this.spawnCooldown <= 0) {
            this.trySpawn();
            this.spawnCooldown = SPAWN_INTERVAL;
        }

        // Alle Kunden updaten
        for (const c of this.customers) {
            c.update(delta);

            // Served → kurz warten → leaving mit Pfad zur Tür
            if (c.state === 'served') {
                c.servedTime = (c.servedTime ?? 0) + delta;
                if (c.servedTime >= CUSTOMER.WAIT_AFTER_SERVED) {
                    this.sendToExit(c);
                }
            }
            if (c.state === 'rage_leaving' && !c.path) {
                this.sendToExit(c);
            }
        }

        // Queue-Logik: frontmost Kunde bekommt Rage-Timer + kann Bestellung abgeben
        this.updateQueue();

        // Fertige Kunden entfernen
        this.customers = this.customers.filter(c => {
            if (c.state === 'done') {
                c.destroy();
                return false;
            }
            return true;
        });
    }

    trySpawn() {
        const Customer = this.scene.CustomerClass;
        const spawn = { x: this.door.gridX, y: this.door.gridY + 1 };

        const c = new Customer(this.scene, spawn.x, spawn.y);
        // Queue-Slot zuweisen (Index in der aktuellen Schlange)
        const slotIndex = this.customers.length;
        const target = this.getQueueSlot(slotIndex);

        const path = findPath(this.collision, { x: spawn.x, y: spawn.y - 1 }, target);
        if (!path) return; // Sollte nicht passieren, aber safety

        // Ersten Weg-Schritt: von draußen durch die Tür
        const fullPath = [{ x: spawn.x, y: spawn.y - 1 }, ...path];
        c.setPath(fullPath);
        this.customers.push(c);
    }

    // Queue-Slot n: n Tiles vor der Kasse weg
    getQueueSlot(n) {
        return {
            x: this.register.gridX,
            y: this.register.gridY + 1 + n * CUSTOMER.QUEUE_SPACING,
        };
    }

    // Der vorderste wartende Kunde darf bestellen, kriegt Rage-Timer
    updateQueue() {
        const queueing = this.customers.filter(c => c.state === 'queueing' || c.state === 'waiting');
        if (queueing.length === 0) return;
        const front = queueing[0];
        if (front.state === 'queueing' && !front.orderRevealed) {
            front.rageActive = true;
        }
    }

    // Frontmost Kunde, der am Register wartet (für Interaktion)
    getActiveCustomer() {
        return this.customers.find(c =>
            (c.state === 'queueing' || c.state === 'waiting') && this.isAtRegister(c)
        );
    }

    isAtRegister(customer) {
        const slot = this.getQueueSlot(0);
        const pos = customer.gridPos;
        return Math.abs(pos.x - slot.x) < 0.5 && Math.abs(pos.y - slot.y) < 0.5;
    }

    sendToExit(customer) {
        if (customer.path && customer.state !== 'served' && customer.state !== 'rage_leaving') return;
        const exit = { x: this.door.gridX, y: this.door.gridY + 1 };
        const from = customer.gridPos;
        const path = findPath(this.collision, from, { x: this.door.gridX, y: this.door.gridY - 1 });
        if (path) {
            path.push(exit);
            customer.setPath(path);
            customer.state = 'leaving';
        } else {
            customer.state = 'done';
        }
    }
}
