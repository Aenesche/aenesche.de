function defaultState(){
  return {
    coins: 0, lifetimeCoins: 0, rp: 0,
    displayName: null, leaderboardOptIn: true, // <-- NEU: Fürs Leaderboard
    owned: Object.fromEntries(DRONES.map(d => [d.id, 0])),
    dUp: Object.fromEntries(DRONES.map(d => [d.id, 0])),
    techLvl: Object.fromEntries(TECH.map(t => [t.id, 0])),
    techOwned: Object.fromEntries(TECH.map(t => [t.id, false])),
    rpLabOwned: 0, flags: { rpLabUnlocked:false, vipOwned:false, newWorldUnlocked: false }, nextExperimentAt: 0,
    cosmetics: {
      themesOwned: Object.fromEntries(THEMES.map(t => [t.id, !!t.unlockByDefault])),
      effectsOwned: Object.fromEntries(EFFECTS.map(e => [e.id, false])),
      activeThemeId: "default", effectsActive: { scanlines:false },
    },
    newWorld: {
      po: 0, nrp: 0, vg: 0, 
      unlockedNodes: [], inventory: [], 
      hangar: { frame: null, props: null, battery: null, fc: null, camera: null }, 
      mission: null 
    },
    lastTick: now(), createdAt: now(),
  };
}

/* Globaler Alias aus profiles.username — geteilt mit /projects/ und den
   anderen Projekten. Fehler sind unkritisch: dann bleibt es beim Default. */
const ANON_NAME = "[ UNKNOWN ANOMALY ]";

async function getGlobalAlias() {
    try {
        if (!user) return null;
        const { data } = await supabaseClient
            .from('profiles').select('username').eq('id', user.id).maybeSingle();
        return (data && data.username) || null;
    } catch (e) { return null; }
}

async function signUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    document.getElementById('auth-msg').innerText = "Authenticating...";
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) document.getElementById('auth-msg').innerText = "Error: " + error.message;
    else document.getElementById('auth-msg').innerText = "Registration successful! You can log in now.";
}

async function signIn() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    document.getElementById('auth-msg').innerText = "Accessing Server...";
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) document.getElementById('auth-msg').innerText = "Error: " + error.message;
    else { user = data.user; loadGameFromServer(); }
}

async function logOut() { await supabaseClient.auth.signOut(); location.reload(); }

async function loadGameFromServer() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('game-wrap').style.display = 'block';

    const { data, error } = await supabaseClient.from('game_state').select('state_json').eq('user_id', user.id).single();

    if (data && data.state_json) {
        state = { ...defaultState(), ...data.state_json };
        if(!state.flags.newWorldUnlocked) state.flags.newWorldUnlocked = false;
        if(!state.newWorld) state.newWorld = defaultState().newWorld;
        
        const nowMs = now();
        if(state.lastTick) {
            const dtSeconds = (nowMs - state.lastTick) / 1000;
            if(dtSeconds > 60) { 
                const offlineCps = coinsPerSecond();
                if(offlineCps > 0) {
                    const earned = offlineCps * dtSeconds;
                    state.coins += earned; state.lifetimeCoins += earned;
                    setTimeout(() => log(`SERVER: +${fmt(earned)} CP while you were offline!`, "ok"), 500);
                }
            }
        }
        state.lastTick = nowMs;

        // Noch kein Leaderboard-Name, aber global schon ein Alias gesetzt?
        // Dann den uebernehmen, statt erneut nach einem Namen zu fragen.
        if (!state.displayName || (state.displayName === ANON_NAME && state.leaderboardOptIn !== false)) {
            const alias = await getGlobalAlias();
            if (alias) {
                state.displayName = alias;
                state.leaderboardOptIn = true;
                await supabaseClient.from('game_state')
                    .update({ display_name: alias, leaderboard_opt_in: true })
                    .eq('user_id', user.id);
            }
        }
    } else {
        state = defaultState();
        // Beim allerersten Speichern die Leaderboard-Spalten füllen —
        // falls global schon ein Alias existiert, direkt den nehmen.
        const alias = await getGlobalAlias();
        if (alias) state.displayName = alias;
        await supabaseClient.from('game_state').insert([{ 
            user_id: user.id, 
            state_json: state,
            display_name: alias || ANON_NAME,
            leaderboard_opt_in: true,
            score_cp: 0,
            score_po: 0
        }]);
    }
    bootGame()
    
    ;setTimeout(() => {
        if (typeof checkAlias === "function") {
            checkAlias();
        }
    }, 500); // Eine halbe Sekunde warten, damit das Spiel im Hintergrund fertig aufgebaut ist
}

async function saveToServer() {
    if(!user || !state) return;
    el.statusTag.textContent = "saving...";
    el.statusTag.style.color = "var(--warn)";
    
    // NEU: Update Befehl mit den extra Spalten für Supabase!
    const { error } = await supabaseClient.from('game_state').update({ 
        state_json: state, 
        updated_at: new Date(),
        display_name: state.displayName || ANON_NAME,
        leaderboard_opt_in: state.leaderboardOptIn !== false, // Ist default true
        score_cp: state.coins || 0,
        score_po: (state.newWorld && state.newWorld.po) ? state.newWorld.po : 0
    }).eq('user_id', user.id);

    if (error) { 
        log("Server Save Failed!", "bad"); 
    } else { 
        el.statusTag.textContent = "autosave: OK"; 
        el.statusTag.style.color = "var(--muted)"; 
    }
}
