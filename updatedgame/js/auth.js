function defaultState(){
  return {
    coins: 0, lifetimeCoins: 0, rp: 0,
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
      po: 0, nrp: 0, vg: 0, // <-- vg: 0 hinzugefügt!
      unlockedNodes: [], inventory: [], 
      hangar: { frame: null, props: null, battery: null, fc: null, camera: null }, 
      mission: null 
    },
    lastTick: now(), createdAt: now(),
  };
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
    } else {
        state = defaultState();
        await supabaseClient.from('game_state').insert([{ user_id: user.id, state_json: state }]);
    }
    bootGame();
}

async function saveToServer() {
    if(!user || !state) return;
    el.statusTag.textContent = "saving...";
    el.statusTag.style.color = "var(--warn)";
    
    const { error } = await supabaseClient.from('game_state').update({ state_json: state, updated_at: new Date() }).eq('user_id', user.id);
    if (error) { log("Server Save Failed!", "bad"); } 
    else { el.statusTag.textContent = "autosave: OK"; el.statusTag.style.color = "var(--muted)"; }
}
