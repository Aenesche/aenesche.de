// Verwaltet alle BuildSlots. Regelt progressive Sichtbarkeit:
// Slot N+1 eines Typs wird erst sichtbar wenn Slot N gekauft ist.
// Slot 0 jedes Typs ist von Anfang an sichtbar (außer die Start-Stationen
// die schon gebaut starten).

import { BUILD } from '../config/constants.js';
import BuildSlot from '../entities/stations/BuildSlot.js';

export default class BuildManager {
    constructor(scene) {
        this.scene = scene;
        this.slots = [];

        // Pro Typ: wie viele davon existieren (Start-Stationen zählen)
this.builtCount = {
            bed: 0, register: 0, storage: 0, hiring: 0, trash: 0,
            terminal_mint: 0, terminal_haze: 0, terminal_kush: 0,
            terminal_crystal: 0, terminal_og: 0,
        };    }

    // Wird von der Scene aufgerufen, nachdem Start-Stationen platziert sind
    init(startStations) {
        // Zähle existierende Stationen
        for (const s of startStations) {
            const name = s.constructor.name.toLowerCase();
            if (name.includes('bed') && !name.includes('tier')) this.builtCount.bed++;
            else if (name.includes('register')) this.builtCount.register++;
            else if (name.includes('storage')) this.builtCount.storage++;
            else if (name.includes('hiring')) this.builtCount.hiring++;
            else if (name.includes('seedterminal') || name.includes('terminal')) {
                // Sorte aus dem Station-Objekt lesen
                if (s.variety) this.builtCount[`terminal_${s.variety.id}`]++;
            }
        }

        // BuildSlots aus der Config erstellen.
        // Überspringe Positionen die schon belegt sind (Start-Stationen).
        const occupied = new Set(startStations.map(s => `${s.gridX},${s.gridY}`));
        const indexPerType = { ...this.builtCount };
        
        for (const def of BUILD.SLOTS) {
            const key = `${def.gridX},${def.gridY}`;
            if (occupied.has(key)) {
                indexPerType[def.type]++;
                continue;
            }
            const idx = indexPerType[def.type]++;
            const slot = new BuildSlot(this.scene, def.gridX, def.gridY, def.type, idx);
            this.slots.push(slot);
        }

        this.updateVisibility();
    }

    // Slot N ist sichtbar wenn builtCount >= N (also alle vorherigen gekauft)
    updateVisibility() {
        // Terminal-Reihenfolge: nur das nächste unbaubare Terminal zeigen
        const terminalOrder = ['terminal_mint', 'terminal_haze', 'terminal_kush', 'terminal_crystal', 'terminal_og'];
        let nextTerminalFound = false;

        for (const slot of this.slots) {
            if (slot.built) {
                slot.visible = false;
                slot.updateVisibility();
                continue;
            }

            if (slot.type.startsWith('terminal_')) {
                // Zeige nur das nächste Terminal in der Reihenfolge
                if (!nextTerminalFound) {
                    const typeIndex = terminalOrder.indexOf(slot.type);
                    const prevType = typeIndex > 0 ? terminalOrder[typeIndex - 1] : null;
                    // Sichtbar wenn vorheriges gebaut ist (oder es das erste ist)
                    if (!prevType || this.builtCount[prevType] > 0) {
                        slot.visible = true;
                        nextTerminalFound = true;
                    } else {
                        slot.visible = false;
                    }
                } else {
                    slot.visible = false;
                }
            } else {
                // Nicht-Terminal: bisherige Logik
                slot.visible = slot.slotIndex <= this.builtCount[slot.type];
            }
            slot.updateVisibility();
        }
    }

    onPurchased(slot) {
        this.builtCount[slot.type]++;
        this.updateVisibility();
    }

    getInteractableSlots() {
        return this.slots.filter(s => !s.built && s.visible);
    }
}
