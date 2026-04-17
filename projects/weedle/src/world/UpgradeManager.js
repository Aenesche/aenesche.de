// Verwaltet Q-Taste: öffnet/schließt Upgrade-Popup für die nächste Station.

import { INTERACTION, ISO } from '../config/constants.js';
import UpgradePopup from '../entities/UpgradePopup.js';

export default class UpgradeManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.popup = new UpgradePopup(scene);

        this.qKey = scene.input.keyboard.addKey('Q');
        this.qKey.on('down', () => this.onQ());
    }

    onQ() {
        if (this.popup.visible) {
            // Popup offen → kaufen versuchen
            const success = this.popup.tryPurchase(this.scene.state);
            if (!success && this.popup.visible) {
                // Nicht kaufbar → schließen
                this.popup.hide();
            }
        } else {
            // Nächste Station finden und Popup öffnen
            const station = this.findNearestUpgradeable();
            if (station) {
                this.popup.show(station);
            }
        }
    }

    update() {
        if (!this.popup.visible) return;

        // Wegbewegen → schließen
        const station = this.popup.station;
        if (station) {
            const rangePixels = INTERACTION.RANGE * ISO.TILE_SIZE;
            const dx = this.player.x - station.isoX;
            const dy = this.player.y - (station.isoY + ISO.TILE_SIZE / 2);
            if (Math.hypot(dx, dy) > rangePixels * 1.2) {
                this.popup.hide();
            }
        }
    }

    findNearestUpgradeable() {
        const rangePixels = INTERACTION.RANGE * ISO.TILE_SIZE;
        let best = null;
        let bestDist = Infinity;

        for (const s of this.scene.stations) {
            // Nur echte Stationen, keine BuildSlots
            if (!s.constructor || s.constructor.name === 'BuildSlot') continue;
            const dx = this.player.x - s.isoX;
            const dy = this.player.y - (s.isoY + ISO.TILE_SIZE / 2);
            const dist = Math.hypot(dx, dy);
            if (dist < rangePixels && dist < bestDist) {
                bestDist = dist;
                best = s;
            }
        }
        return best;
    }
}
