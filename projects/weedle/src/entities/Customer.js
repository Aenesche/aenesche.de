import { COLORS, ISO, CUSTOMER, ITEMS } from '../config/constants.js';
import { gridToIsoCenter, isoCenterToGrid } from '../utils/iso.js';
import PieTimer from './PieTimer.js';

export default class Customer {
    constructor(scene, spawnGridX, spawnGridY, order) {
        this.scene = scene;
        this.state = 'walking_in';
        this.path = null;
        this.pathIndex = 0;

        // Bestellung: Liste von ItemDef-IDs. Wird von außen (Manager) gesetzt.
        this.order = order; // z.B. ['plant', 'plant']
        this.totalItems = order.length;
        this.orderRevealed = false;

        this.rageTime = 0;
        this.rageActive = false;
        this.firstItemReceived = false; // Fix: Rage stoppt ERST wenn Item da

        const spawn = gridToIsoCenter(spawnGridX, spawnGridY, scene.originX, scene.originY);
        this.container = scene.add.container(spawn.x, spawn.y);
        this.container.setDepth(spawn.y);

        const body = scene.add.graphics();
        body.fillStyle(COLORS.CUSTOMER, 0.2);
        body.fillEllipse(0, 0, 24, 12);
        body.lineStyle(2, COLORS.CUSTOMER, 1);
        body.strokeRect(-12, -24, 24, 24);
        body.fillStyle(COLORS.CUSTOMER, 0.2);
        body.fillRect(-12, -24, 24, 24);
        body.fillStyle(COLORS.CUSTOMER, 1);
        body.fillRect(-6, -14, 4, 4);
        body.fillRect(2, -14, 4, 4);
        this.container.add(body);

        this.bubbleGfx = scene.add.graphics();
        this.bubbleGfx.setDepth(250000);

        this.timer = new PieTimer(scene, COLORS.TIMER_RAGE);
    }

    setPath(path) { this.path = path; this.pathIndex = 0; this.restX = null; this.restY = null; }
    get x() { return this.container.x; }
    get y() { return this.container.y; }
    get gridPos() {
        return isoCenterToGrid(this.container.x, this.container.y, this.scene.originX, this.scene.originY);
    }

    update(delta) {
        if ((this.state === 'walking_in' || this.state === 'leaving' || this.state === 'rage_leaving')
            && this.path) {
            this.followPath(delta);
        }

        // Rage-Timer: läuft in queueing/waiting solange kein Item geliefert wurde
        const timerShouldRun = (this.state === 'queueing' || this.state === 'waiting')
                            && this.rageActive
                            && !this.firstItemReceived;

        if (timerShouldRun) {
            // Kassen-Upgrade verlangsamt den Rage-Timer
            const rageMultiplier = this.assignedRegister
                ? Math.pow(0.85, this.assignedRegister.upgradeLevel || 0)
                : 1;
            this.rageTime += delta * rageMultiplier;
            const progress = 1 - Math.min(this.rageTime / CUSTOMER.RAGE_DURATION, 1);
            this.timer.setPosition(this.container.x, this.container.y - 50);
            this.timer.show(progress);
            if (this.rageTime >= CUSTOMER.RAGE_DURATION) {
                this.state = 'rage_leaving';
                this.timer.hide();
            }
        } else {
            this.timer.hide();
        }

        if (this.orderRevealed && this.state !== 'leaving' && this.state !== 'rage_leaving') {
            this.drawBubble();
        } else {
            this.bubbleGfx.clear();
        }

        // Nach dem Anrempeln sanft zur Ruheposition zurückdriften
        if ((this.state === 'queueing' || this.state === 'waiting') && this.restX != null) {
            this.container.x += (this.restX - this.container.x) * 0.07;
            this.container.y += (this.restY - this.container.y) * 0.07;
        }

        this.container.setDepth(this.container.y);
    }

    followPath(delta) {
        if (!this.path || this.pathIndex >= this.path.length) {
            this.onPathComplete();
            return;
        }
        const target = this.path[this.pathIndex];
        const targetScreen = gridToIsoCenter(target.x, target.y, this.scene.originX, this.scene.originY);
        const dx = targetScreen.x - this.container.x;
        const dy = targetScreen.y - this.container.y;
        const dist = Math.hypot(dx, dy);
        const step = (CUSTOMER.SPEED * delta) / 1000;
        if (dist <= step) {
            this.container.x = targetScreen.x;
            this.container.y = targetScreen.y;
            this.pathIndex++;
        } else {
            this.container.x += (dx / dist) * step;
            this.container.y += (dy / dist) * step;
        }
    }

    onPathComplete() {
        if (this.state === 'walking_in') {
            this.state = 'queueing';
            // Ruheposition merken: wird der Kunde vom Player angerempelt,
            // driftet er hierher zurück statt aus der Schlange zu fallen.
            this.restX = this.container.x;
            this.restY = this.container.y;
        } else if (this.state === 'leaving' || this.state === 'rage_leaving') {
            this.state = 'done';
        }
    }

    revealOrder() { this.orderRevealed = true; }

    // Der Rage-Timer stoppt erst HIER, nicht beim Bestellung-Enthüllen
    receiveItem(itemDef) {
        const idx = this.order.indexOf(itemDef.id);
        if (idx === -1) return false;
        this.order.splice(idx, 1);
        this.firstItemReceived = true;

        if (this.order.length === 0) {
            this.state = 'served';
            this.servedTime = 0;
        }
        return true;
    }

    // Ratio der Rage-Zeit: 0 = frisch, 1 = würde gleich wütend
    get rageRatio() {
        return this.rageTime / CUSTOMER.RAGE_DURATION;
    }

    drawBubble() {
        const g = this.bubbleGfx;
        g.clear();
        const itemCount = this.order.length;
        if (itemCount === 0) return;

        const itemSize = 20;
        const padding = 8;
        const width = itemCount * itemSize + padding * 2;
        const height = 18;
        const bx = this.container.x - width / 2;
        const by = this.container.y - 42;

        g.lineStyle(1, 0xffffff, 0.8);
        g.fillStyle(0x000000, 0.8);
        g.fillRect(bx, by - height / 2, width, height);
        g.strokeRect(bx, by - height / 2, width, height);

        for (let i = 0; i < itemCount; i++) {
            const itemId = this.order[i];
            const itemDef = Object.values(ITEMS).find(it => it.id === itemId);
            if (!itemDef) continue;
            const cx = bx + padding + i * itemSize + itemSize / 2 - 2;
            g.fillStyle(itemDef.color, 1);
            g.fillEllipse(cx, by, 8, 5);
            g.lineStyle(1, 0xffffff, 0.6);
            g.strokeEllipse(cx, by, 8, 5);
        }
    }

    destroy() {
        this.container.destroy();
        this.bubbleGfx.destroy();
        this.timer.destroy();
    }
}
