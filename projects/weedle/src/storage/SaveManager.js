// SaveManager: serialisiert den kompletten Spielstand und stellt ihn wieder her.
// Local-first: localStorage sofort, Supabase im Hintergrund (alle paar Sekunden
// + bei wichtigen Ereignissen).
//
// Level-Saves und Freeplay-Saves sind GETRENNT (eigene Keys + eigene Tabellen),
// damit sie sich nicht gegenseitig überschreiben — man kann also ein Level
// angefangen haben UND parallel einen Freeplay-Stand besitzen.
//
// Kunden werden bewusst NICHT gespeichert — nach dem Laden ist der Laden
// kurz leer und füllt sich wieder. Angestellte spawnen an der Hiring-Station.

import { Storage } from './storage.js';
import {
    pushActiveSave, clearActiveSave,
    pushFreeplaySave, clearFreeplaySave,
} from '../net/supabase.js';

const LEVEL_KEY = 'activeSave';
const FREEPLAY_KEY = 'freeplaySave';
const SYNC_INTERVAL_MS = 10000;

export const SaveManager = {
    _lastSync: 0,

    localKey(scene) {
        return scene.levelConfig.freeplay ? FREEPLAY_KEY : LEVEL_KEY;
    },

    // Kompletten Spielstand aus der Scene bauen
    serialize(scene) {
        return {
            version: 1,
            levelId: scene.levelConfig.id,
            freeplay: !!scene.levelConfig.freeplay,
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
        Storage.save(this.localKey(scene), blob);

        const now = Date.now();
        if (force || now - this._lastSync > SYNC_INTERVAL_MS) {
            this._lastSync = now;
            if (userId) {
                if (blob.freeplay) pushFreeplaySave(userId, blob);       // fire & forget
                else pushActiveSave(userId, blob.levelId, blob);
            }
        }
        return blob;
    },

    loadLevelLocal()    { return Storage.load(LEVEL_KEY); },
    loadFreeplayLocal() { return Storage.load(FREEPLAY_KEY); },

    // Rückwärtskompatibel (LevelSelect nutzt das für den Level-Save)
    loadLocal() { return Storage.load(LEVEL_KEY); },

    // Save weg (lokal + remote) — je nach Modus die richtige Quelle
    clear(userId, freeplay = false) {
        if (freeplay) {
            Storage.clear(FREEPLAY_KEY);
            if (userId) clearFreeplaySave();
        } else {
            Storage.clear(LEVEL_KEY);
            if (userId) clearActiveSave();
        }
    },
};
