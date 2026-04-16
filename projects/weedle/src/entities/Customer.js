// Ein Kunde. States:
//   'walking_in'  → läuft zum Queue-Slot
//   'queueing'    → wartet (Rage-Timer läuft wenn frontmost ohne Items)
//   'ordering'    → Spieler nimmt Bestellung auf (Kasse)
//   'waiting'     → Spieler bringt Items (Rage-Timer PAUSIERT laut Doc)
//   'served'      → alle Items bekommen, kurz warten, dann raus
//   'leaving'     → läuft zur Tür zurück
//   'done'        → aus der Scene entfernen (vom Manager)
//
// Bewegung: folgt einem Path aus Grid-Tiles (in Screen-Space konvertiert).

import { COLORS, ISO, CUSTOMER, ITEMS } from '../config/constants.js';
import { gridToIsoCenter, isoCenterToGrid } from '../utils/iso.js';
import PieTimer from './PieTimer.js';

export default class Customer {
    constructor(scene, spawnGridX, spawnGridY) {
        this.scene = scene;
        this.state = 'walking_in';
        this.path = null;
        this.pathIndex = 0;

        // Bestellung: Liste von ItemDef-IDs. Für jetzt: 1 Pflanze.
        this.order = [ITEMS.PLANT.id];
        this.orderRevealed = false;

        // Wut-Timer (läuft nur in 'queueing' wenn frontmost)
        this.rageTime = 0;
        this.rageActive = false;

        // Visual
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

        // Bestellungs-Bubble (erscheint wenn enthüllt)
        this.bubbleGfx = scene.add.graphics();
        this.bubbleGfx.setDepth(250000);

        // Wut-Timer-Anzeige
        this.timer = new PieTimer(scene, COLORS.TIMER_RAGE);
    }

    setPath(path) {
        this.path = path;
        this.pathIndex = 0;
    }

    get x() { return this.container.x; }
    get y() { return this.container.y; }

    get gridPos() {
        return isoCenterToGrid(this.container.x, this.container.y, this.scene.originX, this.scene.originY);
    }

    update(delta) {
        // Pfadverfolgung
        if ((this.state === 'walking_in' || this.state === 'leaving') && this.path) {
            this.followPath(delta);
        }

        // Wut-Timer zählt nur in queueing + rageActive
        if (this.state === 'queueing' && this.rageActive) {
            this.rageTime += delta;
            const progress = 1 - Math.min(this.rageTime / CUSTOMER.RAGE_DURATION, 1);
            this.timer.setPosition(this.container.x, this.container.y - 50);
            this.timer.show(progress);
            if (this.rageTime >= CUSTOMER.RAGE_DURATION) {
                // Wütend → leaving ohne Bezahlung
                this.state = 'rage_leaving';
            }
        } else {
            this.timer.hide();
        }

        // Bestellungs-Bubble folgt dem Kunden
        if (this.orderRevealed && this.state !== 'leaving' && this.state !== 'rage_leaving') {
            this.drawBubble();
        } else {
            this.bubbleGfx.clear();
        }

        // Depth update
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
        } else if (this.state === 'leaving' || this.state === 'rage_leaving') {
            this.state = 'done';
        }
    }

    revealOrder() {
        this.orderRevealed = true;
    }

    // Nimmt ein Item, wenn es in der Bestellung vorkommt. Returns true wenn akzeptiert.
    receiveItem(itemDef) {
        const idx = this.order.indexOf(itemDef.id);
        if (idx === -1) return false;
        this.order.splice(idx, 1);

        // Erstes Item → Rage-Timer pausiert laut Doc
        this.rageActive = false;

        if (this.order.length === 0) {
            this.state = 'served';
            this.servedTime = 0;
        }
        return true;
    }

    drawBubble() {
        const g = this.bubbleGfx;
        g.clear();
        const bx = this.container.x + 20;
        const by = this.container.y - 35;

        // Sprechblase
        g.lineStyle(1, 0xffffff, 0.8);
        g.fillStyle(0x000000, 0.8);
        g.beginPath();
        g.moveTo(bx - 8, by + 8);
        g.lineTo(bx + 25 * this.order.length, by + 8);
        g.lineTo(bx + 25 * this.order.length, by - 10);
        g.lineTo(bx - 8, by - 10);
        g.closePath();
        g.fillPath();
        g.strokePath();

        // Items in der Bubble
        for (let i = 0; i < this.order.length; i++) {
            const itemId = this.order[i];
            const itemDef = Object.values(ITEMS).find(it => it.id === itemId);
            if (!itemDef) continue;
            g.fillStyle(itemDef.color, 1);
            g.fillEllipse(bx + 5 + i * 20, by - 1, 8, 5);
        }
    }

    destroy() {
        this.container.destroy();
        this.bubbleGfx.destroy();
        this.timer.destroy();
    }
}
