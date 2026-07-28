// UI-Einstellungen (getrennt von Audio): Touch-Steuerung an/aus,
// Deckkraft des Overlays, auf welcher Seite der Joystick liegt.
// Persistiert in localStorage.

import { Storage } from '../storage/storage.js';

const KEY = 'uiSettings';

// Touch-Gerät? Dient nur als Vorgabe beim allerersten Start —
// danach entscheidet die gespeicherte Einstellung.
function looksLikeTouch() {
    return typeof window !== 'undefined'
        && ('ontouchstart' in window || (navigator?.maxTouchPoints || 0) > 0);
}

const saved = Storage.load(KEY) || {};

export const UiSettings = {
    mobileControls: saved.mobileControls ?? looksLikeTouch(),
    opacity: saved.opacity ?? 0.55,
    joystickSide: saved.joystickSide ?? 'left',   // 'left' | 'right'

    set(key, value) {
        this[key] = value;
        this.persist();
        this._listeners.forEach(fn => fn(key, value));
    },

    persist() {
        Storage.save(KEY, {
            mobileControls: this.mobileControls,
            opacity: this.opacity,
            joystickSide: this.joystickSide,
        });
    },

    _listeners: [],
    onChange(fn) { this._listeners.push(fn); },
};
