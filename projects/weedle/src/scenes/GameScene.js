// SaveManager: serialisiert den kompletten Spielstand eines Levels und
// stellt ihn wieder her. Local-first: localStorage sofort, Supabase im
// Hintergrund (alle paar Sekunden + bei wichtigen Ereignissen).
//
// Kunden werden bewusst NICHT gespeichert — nach dem Laden ist der Laden
// kurz leer und füllt sich wieder. Angestellte spawnen an der Hiring-Station.

import { Storage } from './storage.js';
import { pushActiveSave, clearActiveSave } from '../net/supabase.js';

const LOCAL_KEY = 'activeSave';
const SYNC_INTERVAL_MS = 10000;

export const SaveManager = {
    _lastSync: 0,

    // Kompletten Spielstand aus der Scene bauen
    serialize(scene) {
        return {
            version: 1,
            levelId: scene.levelConfig.id,
            money: scene.state.money,
            satisfaction: scene.state.satisfaction,
            goals: scene.goals.serialize(),
            employeeSpeedLevel: scene.employeeSpeedLevel || 0,
            stations: scene.stations.map(s => {
                const base = {
                    cls: s.constructor.name,
                    gridX: s.gridX,
                    gridY: s.gridY,
                    upgradeLevel: s.upgradeLevel || 0,
                };
                if (s.constructor.name === 'SeedTerminal') base.variety = s.variety?.id;
                if (s.constructor.name === 'Bed') {
                    base.tier = s.tier || 0;
                    base.state = s.state;
                    base.stateTime = s.stateTime;
                    base.plantedVariety = s.plantedVariety?.id || null;
                }
                if (s.constructor.name === 'StorageTable') {
                    base.slots = s.slots.map(it => it ? it.id : null);
                }
                return base;
            }),
            employees: scene.employees.map(e => ({ role: e.role })),
        };
    },

    // Lokal speichern + ggf. nach Supabase syncen
    autosave(scene, userId, force = false) {
        const blob = this.serialize(scene);
        Storage.save(LOCAL_KEY, blob);

        const now = Date.now();
        if (force || now - this._lastSync > SYNC_INTERVAL_MS) {
            this._lastSync = now;
            if (userId) pushActiveSave(userId, blob.levelId, blob); // fire & forget
        }
        return blob;
    },

    loadLocal() {
        return Storage.load(LOCAL_KEY);
    },

    // Level beendet/verworfen → Save weg (lokal + remote)
    clear(userId) {
        Storage.clear(LOCAL_KEY);
        if (userId) clearActiveSave(); // fire & forget
    },
};
