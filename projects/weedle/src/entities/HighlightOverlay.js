// Visualisiert Boden-Highlight + [E]-Hint + Hold-Progress-Ring für die
// aktuell gehighlightete Station. Nur EIN Overlay-Set, wird umgesetzt
// statt pro Station gezeichnet.

import { COLORS, ISO, INTERACTION } from '../config/constants.js';

export default class HighlightOverlay {
    constructor(scene) {
        this.scene = scene;

        // Boden-Tile-Highlight (Diamond)
        this.tileGfx = scene.add.graphics();
        this.tileGfx.setDepth(-500); // Über Grid, unter Stationen

        // Hold-Progress-Ring + Inhalt
        this.hintGfx = scene.add.graphics();
        this.hintGfx.setDepth(200000); // Über alles

        // [E]-Text
        this.hintText = scene.add.text(0, 0, '[E]', {
            font: 'bold 14px monospace',
            color: '#00ffff',
        });
        this.hintText.setOrigin(0.5, 0.5);
        this.hintText.setDepth(200001);

        this.visible = false;
    }

    show(station, holdProgress) {
        this.visible = true;

        // Boden-Highlight: pulsierender Diamond auf Stations-Tile
        const t = this.scene.time.now;
        const pulse = 0.4 + 0.3 * Math.sin(t / INTERACTION.HIGHLIGHT_PULSE * Math.PI * 2);

        this.tileGfx.clear();
        this.tileGfx.fillStyle(COLORS.WALL, pulse * 0.3);
        this.tileGfx.lineStyle(2, COLORS.WALL, pulse);

        const x = station.isoX;
        const y = station.isoY;
        const s = ISO.TILE_SIZE;

        this.tileGfx.beginPath();
        this.tileGfx.moveTo(x, y);
        this.tileGfx.lineTo(x + s, y + s / 2);
        this.tileGfx.lineTo(x, y + s);
        this.tileGfx.lineTo(x - s, y + s / 2);
        this.tileGfx.closePath();
        this.tileGfx.fillPath();
        this.tileGfx.strokePath();

        // [E]-Hint über dem Objekt schweben lassen
        const hintX = station.isoX;
        const hintY = (station.bounds ? station.bounds.top : y) - 20;

        this.hintText.setPosition(hintX, hintY);
        this.hintText.setVisible(true);

        // Progress-Ring nur wenn Hold aktiv
        this.hintGfx.clear();
        if (holdProgress > 0) {
            const r = 14;
            this.hintGfx.lineStyle(2, COLORS.WALL, 0.3);
            this.hintGfx.strokeCircle(hintX, hintY, r);
            this.hintGfx.lineStyle(3, COLORS.WALL, 1);
            this.hintGfx.beginPath();
            this.hintGfx.arc(
                hintX, hintY, r,
                -Math.PI / 2,
                -Math.PI / 2 + Math.PI * 2 * holdProgress,
                false
            );
            this.hintGfx.strokePath();
        }
    }

    hide() {
        if (!this.visible) return;
        this.visible = false;
        this.tileGfx.clear();
        this.hintGfx.clear();
        this.hintText.setVisible(false);
    }
}
