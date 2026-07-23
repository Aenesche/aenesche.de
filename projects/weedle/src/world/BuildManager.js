// Verwaltet alle BuildSlots. Progressive Sichtbarkeit:
//   - Pro Typ ist immer genau der ERSTE unverbaute Slot sichtbar
//   - Der Preis richtet sich nach der ANZAHL bereits existierender Stationen
//     dieses Typs (vorgebaute + gekaufte) — nicht nach starren Slot-Indizes.
//     Dadurch überlebt die Logik Save/Restore problemlos.
//   - Terminals: Kette Mint → Haze → Kush → Crystal → OG; das nächste
//     Terminal erscheint erst, wenn die vorherige Sorte existiert.

import { BUILD } from '../config/constants.js';
import BuildSlot from '../entities/stations/BuildSlot.js';

const VARIETY_ORDER = ['mint', 'haze', 'kush', 'crystal', 'og'];

export default class BuildManager {
    constructor(scene) {
        this.scene = scene;
        this.slots = [];
        this.allowedTypes = null;

        // Zähler pro Typ, Keys aus der Preistabelle abgeleitet
        this.builtCount = {};
        for (const t of Object.keys(BUILD.PRICES)) this.builtCount[t] = 0;
    }

    // Klassenname → Slot-Typ
    typeOfStation(s) {
        const name = s.constructor.name;
        if (name === 'Bed') return 'bed';
        if (name === 'Register') return 'register';
        if (name === 'StorageTable') return 'storage';
        if (name === 'HiringStation') return 'hiring';
        if (name === 'TrashCan') return 'trash';
        if (name === 'SeedTerminal') return s.variety ? `terminal_${s.variety.id}` : null;
        return null;
    }

    // Wird von der Scene aufgerufen, nachdem Stationen platziert/restauriert sind.
    // allowedTypes: erlaubte Slot-Typen dieses Levels (null = alle).
    init(startStations, allowedTypes = null) {
        this.allowedTypes = allowedTypes;

        for (const s of startStations) {
            const t = this.typeOfStation(s);
            if (t && t in this.builtCount) this.builtCount[t]++;
        }

        // Slots erstellen — belegte Positionen existieren nicht als Slot
        const occupied = new Set(startStations.map(s => `${s.gridX},${s.gridY}`));
        const idxPerType = {};

        for (const def of BUILD.SLOTS) {
            if (this.allowedTypes && !this.allowedTypes.includes(def.type)) continue;
            if (occupied.has(`${def.gridX},${def.gridY}`)) continue;
            const idx = idxPerType[def.type] = (idxPerType[def.type] ?? -1) + 1;
            this.slots.push(new BuildSlot(this.scene, def.gridX, def.gridY, def.type, idx));
        }

        this.updateVisibility();
    }

    // Dynamischer Preis: Anzahl existierender Stationen = Index in der Preisliste
    priceFor(type) {
        const prices = BUILD.PRICES[type] || [];
        const n = this.builtCount[type] || 0;
        return n < prices.length ? prices[n] : Infinity;
    }

    updateVisibility() {
        let nextTerminalFound = false;
        const firstUnbuiltSeen = {};

        for (const slot of this.slots) {
            if (slot.built) {
                slot.visible = false;
                slot.updateVisibility();
                continue;
            }

            if (slot.type.startsWith('terminal_')) {
                const varietyId = slot.type.replace('terminal_', '');
                const idx = VARIETY_ORDER.indexOf(varietyId);
                const prevVariety = idx > 0 ? VARIETY_ORDER[idx - 1] : null;
                const prevExists = !prevVariety || this.scene.stations.some(s =>
                    s.constructor.name === 'SeedTerminal' && s.variety?.id === prevVariety
                );
                const alreadyBuilt = (this.builtCount[slot.type] || 0) > 0;

                if (!nextTerminalFound && prevExists && !alreadyBuilt) {
                    slot.price = this.priceFor(slot.type);
                    slot.visible = Number.isFinite(slot.price);
                    if (slot.visible) nextTerminalFound = true;
                } else {
                    slot.visible = false;
                }
            } else {
                // Erster unverbauter Slot des Typs sichtbar, Rest versteckt
                if (!firstUnbuiltSeen[slot.type]) {
                    firstUnbuiltSeen[slot.type] = true;
                    slot.price = this.priceFor(slot.type);
                    slot.visible = Number.isFinite(slot.price);
                } else {
                    slot.visible = false;
                }
            }
            slot.updateVisibility();
        }
    }

    onPurchased(slot) {
        this.builtCount[slot.type] = (this.builtCount[slot.type] || 0) + 1;
        this.updateVisibility();
    }

    getInteractableSlots() {
        return this.slots.filter(s => !s.built && s.visible);
    }
}
