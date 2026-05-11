// Verwaltet Q-Taste: öffnet/schließt Upgrade-Popup für die nächste Station.

import { INTERACTION, ISO, EMPLOYEE } from '../config/constants.js';
import UpgradePopup from '../entities/UpgradePopup.js';
import HiringPopup from '../entities/HiringPopup.js';
import HiringStation from '../entities/stations/HiringStation.js';

export default class UpgradeManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.popup = new UpgradePopup(scene);
        this.hiringPopup = new HiringPopup(scene);

        this.qKey = scene.input.keyboard.addKey('Q');
        this.qKey.on('down', () => this.onQ());
        this.scene.input.keyboard.addKey('TAB').on('down', (e) => {
            e.originalEvent.preventDefault();
            if (this.popup.visible && this.popup.station?.constructor.name === 'Bed') {
                this.popup.toggleMode();
            }
        });
    }

    onQ() {
        if (this.popup.visible) {
            const success = this.popup.tryPurchase(this.scene.state);
            if (!success) this.popup.hide();
            return;
        }
        if (this.hiringPopup.visible) {
            this.hiringPopup.hide();
            return;
        }

        const station = this.findNearestUpgradeable();
        if (station) {
            this.popup.show(station);
        }
    }

    update() {
        if (this.popup.visible) {
            const station = this.popup.station;
            if (station && this.outOfRange(station)) this.popup.hide();
        }
        if (this.hiringPopup.visible) {
            const station = this.hiringPopup.station;
            if (station && this.outOfRange(station)) this.hiringPopup.hide();
        }
    }

    outOfRange(station) {
        const rangePixels = INTERACTION.RANGE * ISO.TILE_SIZE;
        const dx = this.player.x - station.isoX;
        const dy = this.player.y - (station.isoY + ISO.TILE_SIZE / 2);
        return Math.hypot(dx, dy) > rangePixels * 1.2;
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
