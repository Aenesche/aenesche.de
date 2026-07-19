// Supabase-Anbindung. Nutzt die geteilte Auth-Session von aenesche.de
// (gleiches Projekt, gleicher Origin → supabase-js findet die Session
// automatisch im localStorage).
//
// Alle Weedle-Daten liegen in weedle_*-Tabellen mit RLS pro User.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://usihbregbanpfspblrnw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_EFpYk4bXf7pd1mhM9FbiHg_WKkAlq7n';

// Globale Login-Seite: /projects/ öffnet das Login-Modal (auth-global.js)
export const LOGIN_URL = '/projects/index.html';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Gibt den eingeloggten User zurück oder null.
export async function getUser() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user ?? null;
}

// --- Level-Fortschritt ---

export async function fetchProgress() {
    const { data, error } = await supabase
        .from('weedle_level_progress')
        .select('level_id, stars, best_time_ms');
    if (error) { console.warn('fetchProgress', error); return []; }
    return data;
}

// Speichert nur wenn besser (mehr Sterne, oder gleiche Sterne + schnellere Zeit)
export async function saveProgress(userId, levelId, stars, timeMs) {
    const { data: existing } = await supabase
        .from('weedle_level_progress')
        .select('stars, best_time_ms')
        .eq('level_id', levelId)
        .maybeSingle();

    let newStars = stars;
    let newTime = timeMs;
    if (existing) {
        newStars = Math.max(existing.stars, stars);
        newTime = existing.best_time_ms
            ? Math.min(existing.best_time_ms, timeMs)
            : timeMs;
    }

    const { error } = await supabase
        .from('weedle_level_progress')
        .upsert({
            user_id: userId,
            level_id: levelId,
            stars: newStars,
            best_time_ms: newTime,
            completed_at: new Date().toISOString(),
        });
    if (error) console.warn('saveProgress', error);
}

// --- Aktiver Spielstand (genau einer pro User) ---

export async function fetchActiveSave() {
    const { data, error } = await supabase
        .from('weedle_active_save')
        .select('level_id, save_data, updated_at')
        .maybeSingle();
    if (error) { console.warn('fetchActiveSave', error); return null; }
    return data;
}

export async function pushActiveSave(userId, levelId, saveData) {
    const { error } = await supabase
        .from('weedle_active_save')
        .upsert({
            user_id: userId,
            level_id: levelId,
            save_data: saveData,
            updated_at: new Date().toISOString(),
        });
    if (error) console.warn('pushActiveSave', error);
}

export async function clearActiveSave() {
    const { error } = await supabase.from('weedle_active_save').delete().neq('level_id', -1);
    if (error) console.warn('clearActiveSave', error);
}

// --- Sandbox-Unlocks ---

export async function fetchUnlocks() {
    const { data, error } = await supabase
        .from('weedle_sandbox_unlocks')
        .select('station_type');
    if (error) { console.warn('fetchUnlocks', error); return []; }
    return data.map(r => r.station_type);
}

export async function addUnlocks(userId, stationTypes) {
    if (!stationTypes || stationTypes.length === 0) return;
    const rows = stationTypes.map(t => ({ user_id: userId, station_type: t }));
    // upsert mit ignoreDuplicates: schon vorhandene Unlocks sind kein Fehler
    const { error } = await supabase
        .from('weedle_sandbox_unlocks')
        .upsert(rows, { ignoreDuplicates: true });
    if (error) console.warn('addUnlocks', error);
}
