// InteractionManager: zentrales System für Player↔Station-Interaktion.
//
// Pro Frame:
//  1. Findet die nächste Station in Reichweite (oder null)
//  2. Aktualisiert Highlight darauf
//  3. Wenn E gehalten + Station ist Hold-Type: Progress hochzählen
//  4. Bewegung → Hold abbrechen
//  5. E losgelassen vor Vollendung → Hold abbrechen
//
// Stationen müssen getInteraction() liefern:
//   { type: 'tap',  duration: 0, onComplete: () => {...} }
//   { type: 'hold', duration: 2000, onComplete: () => {...} }
//   oder null wenn momentan nicht interagierbar

import { isoCenterToGrid } from '../utils/iso.js';
import HighlightOverlay from '../entities/HighlightOverlay.js';
import { INTERACTION, ISO } from '../config/constants.js';

export default class InteractionManager {
    constructor(scene, player, stations) {
        this.scene = scene;
        this.player = player;
        this.stations = stations;

        this.activeStation = null;       // Aktuell gehighlighted
        this.highlight = new HighlightOverlay(scene);

        this.holdProgress = 0;           // 0..1
        this.holdActive = false;
        this.lastPlayerX = player.x;
        this.lastPlayerY = player.y;

        // E-Taste
        this.eKey = scene.input.keyboard.addKey('E');
        this.eKey.on('down', () => this.onKeyDown());
        this.eKey.on('up',   () => this.onKeyUp());
    }

    update(delta) {
        // 1. Nächste Station in Reichweite suchen
        const nearest = this.findNearestInRange();

        // 2. Wenn sich Ziel ändert: Hold abbrechen
        if (nearest !== this.activeStation) {
            this.cancelHold();
            this.activeStation = nearest;
        }

        // 3. Highlight aktualisieren
        if (this.activeStation) {
            this.highlight.show(this.activeStation, this.holdProgress);
        } else {
            this.highlight.hide();
        }

        // 4. Bewegungs-Abbruch für Hold
        const moved = this.player.x !== this.lastPlayerX || this.player.y !== this.lastPlayerY;
        if (this.holdActive && moved) {
            this.cancelHold();
        }
        this.lastPlayerX = this.player.x;
        this.lastPlayerY = this.player.y;

        // 5. Hold-Progress hochzählen
        if (this.holdActive && this.activeStation) {
            const interaction = this.activeStation.getInteraction();
            if (interaction && interaction.type === 'hold') {
                this.holdProgress += delta / interaction.duration;
                if (this.holdProgress >= 1) {
                    interaction.onComplete();
                    this.holdProgress = 0;
                    this.holdActive = false;
                }
            }
        }
    }

    onKeyDown() {
        if (!this.activeStation) return;
        const interaction = this.activeStation.getInteraction();
        if (!interaction) return;

        if (interaction.type === 'tap') {
            interaction.onComplete();
        } else if (interaction.type === 'hold') {
            this.holdActive = true;
            this.holdProgress = 0;
        }
    }

    onKeyUp() {
        this.cancelHold();
    }

    cancelHold() {
        this.holdActive = false;
        this.holdProgress = 0;
    }

    findNearestInRange() {
        let best = null;
        let bestDist = Infinity;
        const rangePixels = INTERACTION.RANGE * ISO.TILE_SIZE;

        for (const s of this.stations) {
            // Screen-Space Distanz: einfach Pixel-Abstand zum Tile-Center
            const tileCenterX = s.isoX;
            const tileCenterY = s.isoY + ISO.TILE_SIZE / 2;
            const dx = this.player.x - tileCenterX;
            const dy = this.player.y - tileCenterY;
            const dist = Math.hypot(dx, dy);
            if (dist < rangePixels && dist < bestDist) {
                bestDist = dist;
                best = s;
            }
        }
        return best;
    }
}
