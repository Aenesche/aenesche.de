import { CUSTOMER, SATISFACTION, SPAWN, ITEMS } from '../config/constants.js';
import { findPath } from './Pathfinding.js';
import Register from '../entities/stations/Register.js';

export default class CustomerManager {
    constructor(scene, door, collision, state) {
        this.scene = scene;
        this.door = door;
        this.collision = collision;
        this.state = state;

        this.customers = [];
        this.spawnCooldown = this.currentSpawnInterval();
    }

    // Alle Register aus den Scene-Stationen
    getRegisters() {
        return this.scene.stations.filter(s => s instanceof Register);
    }

    update(delta) {
        this.spawnCooldown -= delta;
        const registers = this.getRegisters();
        if (registers.length === 0) return; // Keine Kassen → keine Kunden

        if (this.customers.length < this.currentMaxCustomers() && this.spawnCooldown <= 0) {
            this.trySpawn(registers);
            this.spawnCooldown = this.currentSpawnInterval();
        }

        for (const c of this.customers) {
            c.update(delta);

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
                this.scene.reportRageQuit?.();
                this.sendToExit(c);
            }
        }

        this.updateRageFlags();

        const before = this.customers.length;
        this.customers = this.customers.filter(c => {
            if (c.state === 'done') {
                c.destroy();
                return false;
            }
            return true;
        });
        if (this.customers.length !== before) {
            this.reassignQueue(registers);
        }
    }

    currentMaxCustomers() {
        const registerCount = this.getRegisters().length;
        const base = CUSTOMER.BASE_MAX + (registerCount - 1) * CUSTOMER.PER_REGISTER_BONUS;
        // Satisfaction kann es noch leicht nach oben/unten skalieren
        const r = this.state.satisfactionRatio;
        return Math.max(1, Math.round(base * (0.5 + r * 0.5)));
    }

    currentSpawnInterval() {
        const r = this.state.satisfactionRatio;
        return SPAWN.INTERVAL_MAX - (SPAWN.INTERVAL_MAX - SPAWN.INTERVAL_MIN) * r;
    }

    generateOrder() {
        const multiChance = Math.max(0, this.state.satisfaction - SATISFACTION.START) * SPAWN.MULTI_ITEM_CHANCE_PER_SAT;
        let size = 1;
        for (let i = 0; i < SPAWN.MAX_ORDER_SIZE - 1; i++) {
            if (Math.random() < multiChance) size++;
            else break;
        }

        // Welche Sorten sind verfügbar? (Terminals die gebaut sind)
        const terminals = this.scene.stations.filter(s => s.constructor.name === 'SeedTerminal');
        const availableVarieties = terminals.map(t => t.variety.id);
        if (availableVarieties.length === 0) return ['plant_mint']; // Fallback

        return Array.from({ length: size }, () => {
            // Höhere Sorten seltener: gewichtet nach umgekehrter Position
            const weights = availableVarieties.map((id, i) => Math.pow(0.6, i));
            const totalWeight = weights.reduce((a, b) => a + b, 0);
            let roll = Math.random() * totalWeight;
            for (let i = 0; i < availableVarieties.length; i++) {
                roll -= weights[i];
                if (roll <= 0) return `plant_${availableVarieties[i]}`;
            }
            return `plant_${availableVarieties[0]}`;
        });
    }

    trySpawn(registers) {
        const Customer = this.scene.CustomerClass;
        const N = this.door.gridY; // = GRID_SIZE
        const sidewalkY = N + 1;
        const fromLeft = Math.random() < 0.5;
        const spawnX = fromLeft ? -6 : N + 6;

        // Kürzeste Kasse finden (wenigste Kunden zugewiesen)
        const assignment = this.findShortestQueue(registers);
        if (!assignment) return;

        const { register, slotIndex, isOutside } = assignment;
        const target = this.getSlotPosition(register, slotIndex, isOutside);

        // Innen-Pfad: von direkt hinter der Tür zum Slot
        const innerPath = findPath(this.collision, { x: this.door.gridX, y: N - 1 }, target);
        if (!innerPath) return;

        const order = this.generateOrder();
        const c = new Customer(this.scene, spawnX, sidewalkY, order);
        c.assignedRegister = register;
        c.queueIndex = slotIndex;
        c.isOutside = isOutside;

        // Voller Weg: off-screen → Gehweg entlang → Tür → innen zum Slot
        const fullPath = [
            { x: spawnX, y: sidewalkY },
            { x: this.door.gridX, y: sidewalkY },
            { x: this.door.gridX, y: N },
            { x: this.door.gridX, y: N - 1 },
            ...innerPath,
        ];
        c.setPath(fullPath);
        this.customers.push(c);
    }

    // Finde die Kasse mit der kürzesten Schlange
    findShortestQueue(registers) {
        let bestRegister = null;
        let bestCount = Infinity;

        for (const reg of registers) {
            const count = this.getQueueLength(reg);
            if (count < bestCount) {
                bestCount = count;
                bestRegister = reg;
            }
        }

        if (!bestRegister) return null;

        const slotIndex = bestCount;
        const isOutside = slotIndex >= CUSTOMER.INDOOR_SLOTS_PER_REGISTER;

        return { register: bestRegister, slotIndex, isOutside };
    }

    // Wie viele Kunden sind einer bestimmten Kasse zugewiesen (noch wartend)
    getQueueLength(register) {
        return this.customers.filter(c =>
            c.assignedRegister === register &&
            (c.state === 'walking_in' || c.state === 'queueing' || c.state === 'waiting')
        ).length;
    }

    // Slot-Position: 0 und 1 drinnen (vor der Kasse), 2+ draußen
    getSlotPosition(register, slotIndex, isOutside) {
        if (!isOutside) {
            // Drinnen: direkt vor der Kasse, gestaffelt
            return {
                x: register.gridX,
                y: register.gridY + 1 + slotIndex * CUSTOMER.QUEUE_SPACING,
            };
        }
        // Draußen: neben der Tür, seitlich verteilt
        const outsideIndex = slotIndex - CUSTOMER.INDOOR_SLOTS_PER_REGISTER;
        return {
            x: this.door.gridX + outsideIndex + 1,
            y: this.door.gridY + 1,
        };
    }

    updateRageFlags() {
        for (const c of this.customers) {
            if (c.state !== 'queueing' && c.state !== 'waiting') {
                c.rageActive = false;
                continue;
            }
            // Alle wartenden Kunden an ihrer Slot-Position bekommen Rage
            const target = this.getSlotPosition(c.assignedRegister, c.queueIndex, c.isOutside);
            const pos = c.gridPos;
            const atSlot = Math.abs(pos.x - target.x) < 0.5 && Math.abs(pos.y - target.y) < 0.5;
            c.rageActive = atSlot;
        }
    }

    // Wenn jemand weg ist: Queue für jede Kasse neu ordnen
    reassignQueue(registers) {
        for (const reg of registers) {
            const queued = this.customers.filter(c =>
                c.assignedRegister === reg &&
                (c.state === 'walking_in' || c.state === 'queueing' || c.state === 'waiting')
            );
            queued.forEach((c, newIndex) => {
                if (c.queueIndex !== newIndex) {
                    c.queueIndex = newIndex;
                    c.isOutside = newIndex >= CUSTOMER.INDOOR_SLOTS_PER_REGISTER;
                    const slot = this.getSlotPosition(reg, newIndex, c.isOutside);
                    const from = c.gridPos;
                    const path = findPath(this.collision, from, slot);
                    if (path) {
                        c.setPath(path);
                        if (c.state === 'queueing') c.state = 'walking_in';
                    }
                }
            });
        }

        // Kunden von langen Schlangen zu kürzeren umverteilen
        this.rebalanceQueues(registers);
    }

    // Wenn eine Kasse deutlich kürzer ist, schicke Kunden von der längeren hin
    rebalanceQueues(registers) {
        if (registers.length < 2) return;

        for (const reg of registers) {
            const queue = this.customers.filter(c =>
                c.assignedRegister === reg &&
                (c.state === 'walking_in' || c.state === 'queueing') &&
                !c.firstItemReceived // Nicht umleiten wenn schon bedient wird
            );
            if (queue.length <= 1) continue;

            // Letzten Kunden in der Schlange prüfen ob andere Kasse kürzer ist
            const last = queue[queue.length - 1];
            let shortestReg = reg;
            let shortestLen = this.getQueueLength(reg);

            for (const otherReg of registers) {
                if (otherReg === reg) continue;
                const otherLen = this.getQueueLength(otherReg);
                if (otherLen < shortestLen - 1) { // Mindestens 2 weniger
                    shortestLen = otherLen;
                    shortestReg = otherReg;
                }
            }

            if (shortestReg !== reg) {
                last.assignedRegister = shortestReg;
                last.queueIndex = shortestLen;
                last.isOutside = last.queueIndex >= CUSTOMER.INDOOR_SLOTS_PER_REGISTER;
                const slot = this.getSlotPosition(shortestReg, last.queueIndex, last.isOutside);
                const from = last.gridPos;
                const path = findPath(this.collision, from, slot);
                if (path) {
                    last.setPath(path);
                    if (last.state === 'queueing') last.state = 'walking_in';
                }
            }
        }
    }

    // Aktiver Kunde an einer bestimmten Kasse (für Register-Interaktion)
    getActiveCustomerAt(register) {
        return this.customers.find(c =>
            c.assignedRegister === register &&
            (c.state === 'queueing' || c.state === 'waiting') &&
            c.queueIndex === 0 &&
            !c.isOutside
        );
    }

    // Backward-compat: getActiveCustomer sucht über alle Kassen
    getActiveCustomer() {
        for (const reg of this.getRegisters()) {
            const c = this.getActiveCustomerAt(reg);
            if (c) return c;
        }
        return null;
    }

    onCustomerServed(customer) {
        const fast = customer.rageRatio < CUSTOMER.FAST_SERVE_THRESHOLD;
        const delta = fast ? SATISFACTION.FAST_SERVE : SATISFACTION.NORMAL_SERVE;
        if (delta !== 0) this.state.adjustSatisfaction(delta);
    }

    sendToExit(customer) {
        const N = this.door.gridY;
        const sidewalkY = N + 1;
        const exitX = Math.random() < 0.5 ? -6 : N + 6;

        const from = customer.gridPos;
        const path = findPath(this.collision, from, { x: this.door.gridX, y: N - 1 });
        if (path) {
            path.push(
                { x: this.door.gridX, y: N },
                { x: this.door.gridX, y: sidewalkY },
                { x: exitX, y: sidewalkY },
            );
            customer.setPath(path);
        } else {
            customer.state = 'done';
        }
    }
}
