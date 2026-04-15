// Player. Container aus Schatten + Body + Augen.
// Bewegt sich frei in Screen-Space. Kollision wird von außen via canMoveTo()
// geprüft — der Player weiß nichts von Wänden, er fragt nur nach.

import { COLORS, PLAYER } from '../config/constants.js';

export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        this.container = scene.add.container(x, y);
        this.container.setDepth(100);

        // Body + Schatten
        const body = scene.add.graphics();
        body.fillStyle(COLORS.PLAYER, 0.2);
        body.fillEllipse(0, 0, 24, 12);          // Schatten am Boden
        body.lineStyle(2, COLORS.PLAYER, 1);
        body.strokeRect(-12, -24, 24, 24);       // Body-Outline
        body.fillStyle(COLORS.PLAYER, 0.2);
        body.fillRect(-12, -24, 24, 24);         // Body-Fill (transparent)
        this.container.add(body);

        // Augen — verschieben sich in Laufrichtung
        this.eyes = scene.add.graphics();
        this.eyes.fillStyle(COLORS.PLAYER, 1);
        this.eyes.fillRect(-6, -2, 4, 4);
        this.eyes.fillRect(2, -2, 4, 4);
        this.eyes.y = -12;
        this.container.add(this.eyes);
    }

    // canMoveTo: (screenX, screenY) => bool. Wird vom Caller bereitgestellt.
    update(delta, dirX, dirY, canMoveTo) {
        // Diagonale normalisieren, sonst läuft man diagonal schneller
        if (dirX !== 0 && dirY !== 0) {
            dirX *= 0.7071;
            dirY *= 0.7071;
        }

        const dt = delta / 1000;
        const dx = dirX * PLAYER.SPEED * dt;
        const dy = dirY * PLAYER.SPEED * dt;

        // Achsen separat prüfen → ermöglicht Sliden entlang einer Wand
        const tryX = this.container.x + dx;
        if (canMoveTo(tryX, this.container.y)) {
            this.container.x = tryX;
        }
        const tryY = this.container.y + dy;
        if (canMoveTo(this.container.x, tryY)) {
            this.container.y = tryY;
        }

        // Augen: Lerp in Richtung Bewegung (max 4px Versatz)
        const targetEyeX = dirX * 4;
        const targetEyeY = -12 + (dirY * 4);
        this.eyes.x += (targetEyeX - this.eyes.x) * 0.2;
        this.eyes.y += (targetEyeY - this.eyes.y) * 0.2;
    }

    get x() { return this.container.x; }
    get y() { return this.container.y; }
}
