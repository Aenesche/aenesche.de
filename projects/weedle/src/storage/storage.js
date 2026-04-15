// Storage-Abstraktion. Jetzt: localStorage. Später: Supabase.
// Die Scenes rufen NUR diese Funktionen auf, nie localStorage direkt.
// So bleibt der Swap auf Supabase ein Einzeiler hier drin.

const PREFIX = 'weedle:';

export const Storage = {
    save(key, value) {
        try {
            localStorage.setItem(PREFIX + key, JSON.stringify(value));
        } catch (e) {
            console.warn('Storage.save failed', e);
        }
    },

    load(key, fallback = null) {
        try {
            const raw = localStorage.getItem(PREFIX + key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            console.warn('Storage.load failed', e);
            return fallback;
        }
    },

    clear(key) {
        localStorage.removeItem(PREFIX + key);
    },

    clearAll() {
        Object.keys(localStorage)
            .filter(k => k.startsWith(PREFIX))
            .forEach(k => localStorage.removeItem(k));
    },
};
