// Passanten: laufen von außerhalb des Screens über den Gehweg und wieder
// raus. Rein atmosphärisch — keine Kollision, keine Interaktion.
// Echte Kunden kommen separat über den CustomerManager (nutzen aber
// denselben Gehweg für ihren Weg zur Tür).

import { ISO } from '../config/constants.js';
import { gridToIsoCenter } from '../utils/iso.js';

const SIDEWALK_ROWS = [ISO.GRID_SIZE + 1, ISO.GRID_SIZE + 2];
const OFFSCREEN_LEFT = -6;
const OFFSCREEN_RIGHT = ISO.GRID_SIZE + 6;

const PED_COLORS = [0x666677, 0x775566, 0x557766, 0x666655, 0x556677];

const MAX_PEDESTRIANS = 4;
const SPAWN_MIN_MS = 2500;
const SPAWN_MAX_MS = 8000;

class Pedestrian {
    constructor(scene, fromLeft, row) {
        this.scene = scene;
        this.speed = 45 + Math.random() * 45;

        const startX = fromLeft ? OFFSCREEN_LEFT : OFFSCREEN_RIGHT;
        this.targetGridX = fromLeft ? OFFSCREEN_RIGHT : OFFSCREEN_LEFT;
        this.row = row;

        const start = gridToIsoCenter(startX, row, scene.originX, scene.originY);
        const end = gridToIsoCenter(this.targetGridX, row, scene.originX, scene.originY);
        this.endX = end.x;
        this.endY = end.y;

        const color = PED_COLORS[Math.floor(Math.random() * PED_COLORS.length)];
        this.container = scene.add.container(start.x, start.y);
        this.container.setDepth(start.y);

        const body = scene.add.graphics();
        body.fillStyle(color, 0.15);
        body.fillEllipse(0, 0, 22, 10);
        body.lineStyle(2, color, 0.8);
        body.strokeRect(-11, -22, 22, 22);
        body.fillStyle(color, 0.15);
        body.fillRect(-11, -22, 22, 22);
        body.fillStyle(color, 0.9);
        body.fillRect(-5, -13, 3, 3);
        body.fillRect(2, -13, 3, 3);
        this.container.add(body);

        this.done = false;
    }

    update(delta) {
        const dx = this.endX - this.container.x;
        const dy = this.endY - this.container.y;
        const dist = Math.hypot(dx, dy);
        const step = (this.speed * delta) / 1000;

        if (dist <= step) {
            this.done = true;
            return;
        }
        this.container.x += (dx / dist) * step;
        this.container.y += (dy / dist) * step;
        this.container.setDepth(this.container.y);
    }

    destroy() {
        this.container.destroy();
    }
}

export default class PedestrianManager {
    constructor(scene) {
        this.scene = scene;
        this.pedestrians = [];
        this.spawnCooldown = 1000;
    }

    update(delta) {
        this.spawnCooldown -= delta;
        if (this.spawnCooldown <= 0 && this.pedestrians.length < MAX_PEDESTRIANS) {
            const fromLeft = Math.random() < 0.5;
            const row = SIDEWALK_ROWS[Math.floor(Math.random() * SIDEWALK_ROWS.length)];
            this.pedestrians.push(new Pedestrian(this.scene, fromLeft, row));
            this.spawnCooldown = SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
        }

        for (const p of this.pedestrians) p.update(delta);

        this.pedestrians = this.pedestrians.filter(p => {
            if (p.done) { p.destroy(); return false; }
            return true;
        });
    }
}
