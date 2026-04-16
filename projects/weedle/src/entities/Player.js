// Player. Container aus Schatten + Body + Augen.
// Bewegt sich frei in Screen-Space. Kollision wird von außen via canMoveTo()
// geprüft — der Player weiß nichts von Wänden, er fragt nur nach.

import { COLORS, PLAYER, OCCLUSION } from '../config/constants.js';

export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        this.container = scene.add.container(x, y);
        this.container.setDepth(y);

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

        this.targetAlpha = 1;
        this.currentAlpha = 1;
        // Offset von Container-Position zur logischen Fuß-Position
        // Container.y ist Mitte des Schattens (Boden). Für Kollision korrekt.
        // Aber der visuelle Body ragt 24px nach oben — dadurch wirkt es
        // als ob die Kollision "zu tief" sitzt. Wir shiften den Footprint
        // leicht nach oben, damit es sich visuell richtig anfühlt.
        this.footOffsetY = 0;
        // Inventar — exakt 1 Item-Slot (1-Item-Regel)
        this.carriedItem = null;
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

        if (dx !== 0 || dy !== 0) {
            // canMoveTo bekommt Fuß-Position (mit Offset), nicht Container-Mitte
            const footCanMove = (x, y) => canMoveTo(x, y + this.footOffsetY);
            this.moveWithSlide(dx, dy, footCanMove);
        }
        // Iso-Depth: höhere Screen-Y → näher an der Kamera → höher zeichnen.
        // So läuft der Player automatisch vor/hinter Stationen je nach Position.
        this.container.setDepth(this.container.y);

        // Augen: Lerp in Richtung Bewegung (max 4px Versatz)
        const targetEyeX = dirX * 4;
        const targetEyeY = -12 + (dirY * 4);
        this.eyes.x += (targetEyeX - this.eyes.x) * 0.2;
        this.eyes.y += (targetEyeY - this.eyes.y) * 0.2;
    }

    // Iso-aware Wall-Sliding.
    // Strategie:
    //   1) Vollbewegung versuchen
    //   2) Wenn blockiert: Bewegungsvektor auf die zwei Iso-Wandrichtungen projizieren
    //      und die besser passende Projektion zuerst probieren
    //
    // In dieser Iso-Welt gibt's nur zwei Wand-Orientierungen im Screen-Space:
    //   (2, 1)  → Wände mit konstantem gridY (Nord/Süd)
    //   (-2, 1) → Wände mit konstantem gridX (West/Ost)
    // Stationen werden später denselben Achsen folgen, daher gilt das auch für sie.
    moveWithSlide(dx, dy, canMoveTo) {
        const cx = this.container.x;
        const cy = this.container.y;

        // 1) Vollbewegung
        if (canMoveTo(cx + dx, cy + dy)) {
            this.container.x = cx + dx;
            this.container.y = cy + dy;
            return;
        }

        // 2) Projektionen berechnen
        const projections = [
            { x: 2, y: 1 },
            { x: -2, y: 1 },
        ].map(d => {
            const len = Math.hypot(d.x, d.y);
            const ux = d.x / len;
            const uy = d.y / len;
            const dot = dx * ux + dy * uy;
            return { absDot: Math.abs(dot), sx: dot * ux, sy: dot * uy };
        });

        // Mehr ausgerichtete Projektion zuerst (bewahrt Spieler-Intent besser)
        projections.sort((a, b) => b.absDot - a.absDot);

        for (const p of projections) {
            if (canMoveTo(cx + p.sx, cy + p.sy)) {
                this.container.x = cx + p.sx;
                this.container.y = cy + p.sy;
                return;
            }
        }

        // Beide Projektionen blockiert → Ecke, gar keine Bewegung
    }

    get x() { return this.container.x; }
    get y() { return this.container.y; }
    get footX() { return this.container.x; }
    get footY() { return this.container.y + this.footOffsetY; }

    // Wird von der Scene aufgerufen mit allen Objekten, die den Player verdecken könnten.
    updateOcclusion(occluders) {
        const isHidden = occluders.some(o => o.occludesPlayerAt && o.occludesPlayerAt(this.x, this.y));
        this.targetAlpha = isHidden ? OCCLUSION.ALPHA : 1;
        this.currentAlpha += (this.targetAlpha - this.currentAlpha) * OCCLUSION.LERP;
        this.container.setAlpha(this.currentAlpha);
    }
    hasItem() {
        return this.carriedItem !== null;
    }

    pickUp(carriedItem) {
        if (this.hasItem()) return false;
        this.carriedItem = carriedItem;
        // Item überm Kopf positionieren (-32 = oberhalb der Body-Box)
        carriedItem.graphics.setPosition(0, -32);
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
}
