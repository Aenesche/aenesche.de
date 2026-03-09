// ---------- HELPER & LOGIK ----------
const now = () => Date.now();
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

function fmt(n){
  n = Number(n) || 0;
  if (n < 1000) return String(Math.floor(n));
  const units = ["k","M","B","T","Qa","Qi"];
  let u = -1;
  while(n >= 1000 && u < units.length-1){ n/=1000; u++; }
  return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : n.toFixed(0)) + units[u];
}

function log(line, cls=""){
  const t = new Date().toLocaleTimeString();
  const msg = `[${t}] ${cls ? `<span class="${cls}">` : ""}${String(line).replaceAll("<","&lt;")}${cls ? `</span>` : ""}`;
  
  const div1 = document.createElement("div"); div1.innerHTML = msg;
  el.log.appendChild(div1);
  while(el.log.childNodes.length > MAX_LOG_LINES) el.log.removeChild(el.log.firstChild);
  el.log.scrollTop = el.log.scrollHeight;

  const nwLog = document.getElementById("nw-log");
  if (nwLog) {
      const div2 = document.createElement("div"); div2.innerHTML = msg;
      nwLog.appendChild(div2);
      while(nwLog.childNodes.length > MAX_LOG_LINES) nwLog.removeChild(nwLog.firstChild);
      nwLog.scrollTop = nwLog.scrollHeight;
  }
}

// ---------- BASE GAME MATH ----------
function isUnlocked(u){
  if(u.type === "always") return true;
  if(u.type === "owned") return (state.owned[u.id] || 0) >= u.n;
  return false;
}
function dronePrice(drone){ return Math.floor(drone.basePrice * Math.pow(PRICE_GROWTH, state.owned[drone.id] || 0)); }
function droneUpgradeCost(droneBasePrice, level){
  const base = droneBasePrice * 12;
  return Math.floor(base * Math.pow(2.6, level));
}
function rpLabPrice(){ return Math.floor(RP_LAB.basePrice * Math.pow(RP_LAB.priceGrowth, state.rpLabOwned || 0)); }
function droneMultiplier(droneId){ return Math.pow(2, state.dUp[droneId] || 0); }
function globalCpsMultiplier(){ return Math.pow(1.05, state.techLvl.globalCps || 0); }
function droneCpsMultiplier(){ return Math.pow(1.06, state.techLvl.droneBoost || 0); }
function clickMultiplier(){ return Math.pow(2, state.techLvl.clickBoost || 0); }
function rpLabMultiplier(){ return Math.pow(1.25, state.techLvl.rpLabBoost || 0); }

function clickPower(){
  let base = 1;
  const temu = state.owned.temu || 0;
  base *= Math.pow(1.10, Math.floor(temu / 25));
  const m = state.owned.matrice || 0;
  if(m >= 10) base *= 2; if(m >= 20) base *= 2; if(m >= 35) base *= 4;
  return base * clickMultiplier();
}

function coinsPerSecond(){
  let cps = 0;
  for(const d of DRONES){
    const owned = state.owned[d.id] || 0;
    if(owned > 0) cps += owned * d.baseCps * droneMultiplier(d.id);
  }
  return cps * droneCpsMultiplier() * globalCpsMultiplier();
}

function rpPerSecond(){
  if(!state.flags.rpLabUnlocked || (state.rpLabOwned || 0) <= 0) return 0;
  return state.rpLabOwned * RP_LAB.baseRps * rpLabMultiplier();
}

function addCoins(x){
  if(x <= 0) return;
  state.coins += x;
  state.lifetimeCoins += x;
}

// ---------- ACTIONS ----------
function doClick(){
  const p = clickPower(); addCoins(p); log(`click +${fmt(p)} CP`);
}
function buyDrone(drone){
  if(!isUnlocked(drone.unlock)) return log(`locked: ${drone.name}`, "bad");
  const cost = dronePrice(drone);
  if(state.coins < cost) return log(`need ${fmt(cost)} CP for ${drone.name}`, "bad");
  state.coins -= cost; state.owned[drone.id] = (state.owned[drone.id] || 0) + 1;
  log(`bought ${drone.name}`, "ok");
}
function buyDroneUpgrade(drone){
  const lvl = state.dUp[drone.id] || 0; const cost = droneUpgradeCost(drone.basePrice, lvl);
  if((state.owned[drone.id] || 0) <= 0) return log(`buy the drone first`, "bad");
  if(state.coins < cost) return log(`need ${fmt(cost)} CP`, "bad");
  state.coins -= cost; state.dUp[drone.id] = lvl + 1; log(`${drone.name} upgrade → level ${lvl+1}`, "ok");
}
function techCost(t){
  if(t.type === "one") return t.baseCost;
  return Math.floor(t.baseCost * Math.pow(t.growth, state.techLvl[t.id] || 0));
}
function buyTech(t){
  if(t.type === "one" && state.techOwned[t.id]) return log(`already owned`, "bad");
  const cost = techCost(t);
  if(state.rp < cost) return log(`need ${cost} RP`, "bad");
  state.rp -= cost;
  if(t.type === "one"){
    state.techOwned[t.id] = true; if(t.apply) t.apply(state); log(`tech unlocked: ${t.name}`, "ok");
  } else {
    state.techLvl[t.id] = (state.techLvl[t.id] || 0) + 1; log(`tech upgraded: ${t.name}`, "ok");
  }
}
function buyRpLab(){
  if(!state.flags.rpLabUnlocked) return log("RP-Lab locked", "bad");
  const cost = rpLabPrice();
  if(state.coins < cost) return log(`need ${fmt(cost)} CP`, "bad");
  state.coins -= cost; state.rpLabOwned += 1; log(`bought RP-Lab`, "ok");
}
function runExperiment(){
  const t = now();
  if(t < state.nextExperimentAt) return log(`cooling down`, "bad");
  const gain = 1 + Math.floor(Math.log10(1 + state.lifetimeCoins) * 0.7);
  state.rp += gain; state.nextExperimentAt = t + EXPERIMENT_CD_MS; log(`experiment complete: +${gain} RP`, "ok");
}
function buyTheme(theme){
  if(state.cosmetics.themesOwned[theme.id]) return log(`already owned`, "bad");
  if(state.coins < theme.cost) return log(`need ${fmt(theme.cost)} CP`, "bad");
  state.coins -= theme.cost; state.cosmetics.themesOwned[theme.id] = true; log(`unlocked: ${theme.name}`, "ok");
}
function activateTheme(themeId){
  if(!state.cosmetics.themesOwned[themeId]) return log("not owned", "bad");
  state.cosmetics.activeThemeId = themeId; applyCosmetics(); log(`theme active`, "ok");
}
function buyEffect(effect){
  if(state.cosmetics.effectsOwned[effect.id]) return;
  if(state.coins < effect.cost) return log(`need ${fmt(effect.cost)} CP`, "bad");
  state.coins -= effect.cost; state.cosmetics.effectsOwned[effect.id] = true; log(`unlocked: ${effect.name}`, "ok");
}
function toggleEffect(effectId){
  if(!state.cosmetics.effectsOwned[effectId]) return;
  if(effectId === "cheeta"){
    if(!state.flags.newWorldUnlocked) {
       state.flags.newWorldUnlocked = true;
       log("C.H.E.E.T.A. protocol overrides safety limits.", "warn");
       log("ACCESS GRANTED: NEW WORLD UNLOCKED.", "warn");
       render(); saveToServer();
    } else { log("You are already connected to the New World.", "muted"); }
    return;
  }
  state.cosmetics.effectsActive[effectId] = !state.cosmetics.effectsActive[effectId];
  applyCosmetics(); log(`effect toggled`, "ok");
}

// ---------- NEW WORLD LOGIC ----------
function generateLootDrop(luckMultiplier) {
    const r = Math.random() * 100; 
    let chosenRarity = "Common";
    if (r < (RARITIES["Ultra Rare"].dropChance * luckMultiplier)) chosenRarity = "Ultra Rare";
    else if (r < (RARITIES["Legendary"].dropChance * luckMultiplier)) chosenRarity = "Legendary";
    else if (r < (RARITIES["Super Rare"].dropChance * luckMultiplier)) chosenRarity = "Super Rare";
    else if (r < (RARITIES["Rare"].dropChance * luckMultiplier)) chosenRarity = "Rare";

    const craftableIds = Object.values(TECH_TREE).map(node => node.partId);
    const possibleItems = Object.keys(PART_CATALOG).filter(id => PART_CATALOG[id].rarity === chosenRarity && !craftableIds.includes(id));
    const randomItemId = possibleItems.length > 0 ? possibleItems[Math.floor(Math.random() * possibleItems.length)] : "fr_com_1"; 
    
    const baseItem = PART_CATALOG[randomItemId];
    return { id: "drop_" + Date.now() + "_" + Math.floor(Math.random()*10000), catalogId: randomItemId, type: baseItem.type, name: baseItem.name, rarity: baseItem.rarity };
}

function equipPart(partId) {
    const index = state.newWorld.inventory.findIndex(p => p.id === partId);
    if(index === -1) return;
    const part = state.newWorld.inventory[index];
    if(state.newWorld.hangar[part.type]) state.newWorld.inventory.push(state.newWorld.hangar[part.type]);
    state.newWorld.hangar[part.type] = part;
    state.newWorld.inventory.splice(index, 1);
    saveToServer(); renderNewWorld();
}

function unequipPart(type) {
    if(!state.newWorld.hangar[type]) return;
    state.newWorld.inventory.push(state.newWorld.hangar[type]);
    state.newWorld.hangar[type] = null;
    saveToServer(); renderNewWorld();
}

const BASE_MISSION_DURATION = 30000;
// ==========================================
// 🚁 MISSIONS-LOGIK (NEW WORLD)
// ==========================================

function startMission() {
    const h = state.newWorld.hangar;
    if (!h.battery || !h.frame || !h.props || !h.camera || !h.fc) {
        log("Hangar incomplete! Equip all 5 parts before launch.", "bad");
        return;
    }

    const bat = PART_CATALOG[h.battery.catalogId];
    const props = PART_CATALOG[h.props.catalogId];
    const frame = PART_CATALOG[h.frame.catalogId];
    const fc = PART_CATALOG[h.fc.catalogId];

    // --- 1. DAUER BERECHNEN ---
    let timeMult = bat.timeMult || 1;
    if (frame.special?.type === "heavyweight") timeMult *= 1.5;
    if (fc.special?.type === "agility_boost") timeMult *= 0.95;

    let durationMs = 30000 * timeMult;

    // Exot: Chrono-Stutter
    if (props.special?.type === "instant_mission" && Math.random() < props.special.value) {
        durationMs = 0;
        log("CHRONO-STUTTER! Raum-Zeit gekrümmt. Mission sofort beendet.", "ok");
    }

    state.newWorld.mission = {
        status: "IN_PROGRESS",
        startTime: Date.now(),
        duration: durationMs,
        endTime: Date.now() + durationMs,
        result: null
    };

    log("Drone launched into the wasteland!", "ok");
    saveToServer();
    renderNewWorld();
}

function resolveMission() {
    const m = state.newWorld.mission;
    if (!m || m.status !== "IN_PROGRESS") return;

    const h = state.newWorld.hangar;
    const bat = PART_CATALOG[h.battery.catalogId];
    const frame = PART_CATALOG[h.frame.catalogId];
    const props = PART_CATALOG[h.props.catalogId];
    const cam = PART_CATALOG[h.camera.catalogId];
    const fc = PART_CATALOG[h.fc.catalogId];

    // --- 1. BASIS-WERT SAMMLUNG ---
    let luck = cam.luckBonus || 1;
    let vgChance = cam.vgChance || 0;
    let crashRisk = frame.breakChance || 0;
    let poMult = props.poMult || 1;
    let nrpMult = props.nrpMult || 1;

    // --- 2. SYNERGIEN & MODIFIKATOREN ---
    // Kamera & FC Synergien
    if (fc.special?.type === "set_bonus_v1" && cam.special?.type === "synergy_ready" && cam.special.value === "v1") luck *= fc.special.value;
    if (fc.special?.type === "set_bonus_o3" && cam.special?.type === "synergy_ready" && cam.special.value === "o3") luck *= fc.special.value;
    
    // Flat Boni
    if (bat.special?.type === "void_find") vgChance += bat.special.value;
    if (frame.special?.type === "void_find") vgChance += frame.special.value;
    if (fc.special?.type === "luck_boost") luck += fc.special.value;
    
    // Crash Risiko Modifikatoren
    if (bat.special?.type === "burnout_risk") crashRisk += bat.special.value;
    if (props.special?.type === "burnout_risk" || props.special?.type === "break_risk") crashRisk += props.special.value;
    if (fc.special?.type === "auto_level") crashRisk = Math.max(0, crashRisk - fc.special.value);
    if (frame.special?.type === "heavyweight") crashRisk = 0; // Juggernaut

    // --- 3. DER CRASH-WÜRFEL ---
    // NEU: ai_safety (z.B. Sentient Power Cell) reduziert verbleibendes Risiko
    if (bat.special?.type === "ai_safety") crashRisk *= (1 - bat.special.value); 

    let isCrash = Math.random() < crashRisk;
    
    // Phoenix Alloy Rebirth
    if (isCrash && frame.special?.type === "rebirth" && Math.random() < frame.special.value) {
        isCrash = false; 
        log("PHOENIX ALLOY ACTIVATED! Lethal crash averted.", "ok");
    }

    // --- 4. LOOT BERECHNUNG ---
    let basePo = Math.floor(Math.random() * 50) + 10;
    let baseNrp = Math.floor(Math.random() * 5) + 1;
    let totalPo = basePo * poMult;
    let totalNrp = baseNrp * nrpMult;

    // Kamera Flat Boni
    if (cam.special?.type === "flat_po" && Math.random() < cam.special.chance) {
        totalPo += cam.special.value;
    }
    if (cam.special?.type === "flat_nrp" && Math.random() < cam.special.chance) {
        totalNrp += cam.special.value;
    }

    // Result Container vorbereiten
    m.result = {
        crashed: isCrash,
        savedPartsCount: 0,
        insuranceFraud: false,
        blackboxNrp: 0,
        poGained: 0,
        nrpGained: 0,
        vgGained: 0,
        drops: [] 
    };

    if (isCrash) {
        // --- 5A. CRASH HANDLING ---
        if (fc.special?.type === "rth_flawless" || bat.special?.type === "save_parts" || frame.special?.type === "save_parts") {
            m.result.savedPartsCount = 5;
        } else if (fc.special?.type === "rth_v2") {
            m.result.savedPartsCount = 3;
        } else if (fc.special?.type === "rth_v1") {
            m.result.savedPartsCount = 1;
        }

        if (fc.special?.type === "insurance_fraud") m.result.insuranceFraud = true;
        if (fc.special?.type === "blackbox") m.result.blackboxNrp = Math.floor(totalNrp * fc.special.value);

        // Loot Bunker Frame Mechanik
        if (frame.special?.type === "loot_armor") {
            m.result.poGained = Math.floor(totalPo * frame.special.value);
            m.result.nrpGained = Math.floor(totalNrp * frame.special.value);
            log(`LOOT BUNKER ACTIVE: Rettete ${m.result.poGained} PO aus den Trümmern!`, "warn");
        }

        log("SIGNAL LOST: Drone encountered a fatal error!", "bad");
    } else {
        // --- 5B. SUCCESS HANDLING ---
        // Double Loot (Batterie)
        if (bat.special?.type === "double_loot" && Math.random() < bat.special.value) {
            totalPo *= 2; totalNrp *= 2; luck *= 2;
        }
        
        // Multiplikatoren anwenden
        if (fc.special?.type === "overclock_po") totalPo *= (1 + fc.special.value);
        if (props.special?.type === "double_po") totalPo *= 2;

        // Neural Overload (PO -> N-RP)
        if (props.special?.type === "po_to_nrp") {
            totalNrp += totalPo; 
            totalPo = 0;
        }

        // Void Gems würfeln (Skalierendes Cluster)
        let vgFound = 0;
        if (Math.random() < vgChance) {
            let baseVg = Math.floor(Math.random() * 8) + 3; // Findet 3 bis 10 Steine
            vgFound = Math.floor(baseVg * luck); // Multipliziert mit Luck
            if (props.special?.type === "double_vg") vgFound *= 2;
        }

        // Blueprint Drops
        if (cam.special?.type !== "no_parts") {
            const dropChance = Math.min(1.0, 0.005 * luck); 
            const exclusiveChance = Math.min(0.02, 0.0001 * luck);

            let guaranteeDrop = false;
            let guaranteeRare = false;

            // Prüfen, ob Exoten-Specials greifen
            if (cam.special?.type === "blueprint_drop" && Math.random() < cam.special.chance) guaranteeDrop = true;
            if (props.special?.type === "free_blueprint" && Math.random() < props.special.value) guaranteeDrop = true;
            if (cam.special?.type === "guarantee_rare") guaranteeRare = true;

            if (Math.random() < dropChance || guaranteeDrop) {
                const dropNodes = Object.keys(TECH_TREE).filter(key => TECH_TREE[key].dropOnly);
                
                if (dropNodes.length > 0 && (Math.random() < exclusiveChance || guaranteeRare)) {
                    // Jackpot-Drop für ein Exklusiv-Teil!
                    const randomDropId = dropNodes[Math.floor(Math.random() * dropNodes.length)];
                    m.result.drops.push(randomDropId);
                } else if (!guaranteeRare) {
                    totalPo += 250; // Kleiner Schrott-Bonus, falls kein Blueprint gedroppt ist
                }
            }
        }
      // NEU: drone_swarm Fake-Logik (Am Ende von 5B. SUCCESS HANDLING)
        if (fc.special?.type === "drone_swarm") {
            totalPo *= fc.special.value; // Loot mal 3
            totalNrp *= fc.special.value; 
            log("HIVE-MIND ACTIVE: Drohnenschwarm hat Sektor 3-fach geplündert!", "ok");
        }

        m.result.poGained = Math.floor(totalPo);

        m.result.poGained = Math.floor(totalPo);
        m.result.nrpGained = Math.floor(totalNrp);
        m.result.vgGained = vgFound;

        log("MISSION COMPLETE: Drone returning with payload.", "ok");
    }

    m.status = "WAITING_FOR_CLAIM";
    saveToServer();
    renderNewWorld();
}

function claimMissionResult() {
    const m = state.newWorld.mission;
    if (!m || m.status !== "WAITING_FOR_CLAIM") return;

    const res = m.result;

    if (res.crashed) {
        // --- CRASH AUSFÜHREN ---
        let destroyedCount = 0;
        if (res.savedPartsCount < 5) {
            const parts = ["battery", "frame", "props", "camera", "fc"];
            // Shuffle Array um zufällige Teile zu zerstören
            parts.sort(() => 0.5 - Math.random()); 
            
            for (let i = res.savedPartsCount; i < 5; i++) {
                const key = parts[i];
                if (state.newWorld.hangar[key]) {
                    const invId = state.newWorld.hangar[key].id;
                    state.newWorld.inventory = state.newWorld.inventory.filter(item => item.id !== invId);
                    state.newWorld.hangar[key] = null;
                    destroyedCount++;
                }
            }
        }
        
        if (destroyedCount > 0) {
            log(`CRASH IMPACT: ${destroyedCount} Bauteile wurden irreparabel zerstört.`, "bad");
        } else {
            log(`CRASH IMPACT: Notfallsysteme haben alle Bauteile gerettet!`, "warn");
        }

        if (res.insuranceFraud) {
            const payoutCP = 1000000000000; // 1T CP
            const payoutVG = 10;
            state.coins += payoutCP;
            state.newWorld.vg = (state.newWorld.vg || 0) + payoutVG;
            log(`INSURANCE FRAUD: Auszahlung von ${fmt(payoutCP)} CP & ${payoutVG} VG erhalten!`, "ok");
        }

        if (res.blackboxNrp > 0) {
            state.newWorld.nrp = (state.newWorld.nrp || 0) + res.blackboxNrp;
            log(`BLACKBOX RECOVERY: +${res.blackboxNrp} N-RP aus den Trümmern geborgen.`, "ok");
        }

    } else {
        // --- SUCCESS AUSFÜHREN ---
        state.newWorld.po = (state.newWorld.po || 0) + res.poGained;
        state.newWorld.nrp = (state.newWorld.nrp || 0) + res.nrpGained;
        state.newWorld.vg = (state.newWorld.vg || 0) + res.vgGained;
        
        let lootMsg = `RESOURCES SECURED: +${fmt(res.poGained)} PO | +${res.nrpGained} N-RP`;
        if (res.vgGained > 0) lootMsg += ` | +${res.vgGained} VG!`;
        log(lootMsg, "ok");

        // Drops ins Inventar packen
        res.drops.forEach(dropId => {
            const node = TECH_TREE[dropId];
            const part = PART_CATALOG[node.partId];
            
            if (!state.newWorld.unlockedNodes.includes(dropId)) {
                state.newWorld.unlockedNodes.push(dropId);
                log(`ANOMALY DISCOVERED! Neuer Blueprint entschlüsselt.`, "ok");
            }
            
            state.newWorld.inventory.push({ 
                id: "drop_" + Date.now() + "_" + Math.floor(Math.random()*1000), 
                catalogId: node.partId, type: part.type, name: part.name, rarity: part.rarity 
            });
            log(`>> ACQUIRED EXOTIC: ${part.name} <<`, "ok");
        });
    }

    state.newWorld.mission = null;
    saveToServer();
    renderNewWorld();
}
function unlockNode(nodeId) {
    const node = TECH_TREE[nodeId];
    if(!node) return;
    
    // SICHERHEIT: Prüfen, ob der Knoten auf dem Pfad erreichbar ist!
    const isReachable = node.dropOnly ? false : (node.req.length === 0 || node.req.some(reqId => state.newWorld.unlockedNodes.includes(reqId)));
    
    if (!isReachable) {
        log("Blueprint locked! Research previous nodes first.", "bad");
        return;
    }

    const reqRp = node.unlockCost.rp || 0;
    const reqNrp = node.unlockCost.nrp || 0;
    const reqVg = node.unlockCost.vg || 0;

    if (state.rp < reqRp || (state.newWorld.nrp || 0) < reqNrp || (state.newWorld.vg || 0) < reqVg) {
        log("Not enough resources to research this blueprint!", "bad"); return;
    }
    
    state.rp -= reqRp; 
    state.newWorld.nrp -= reqNrp;
    state.newWorld.vg -= reqVg;

    if(!state.newWorld.unlockedNodes) state.newWorld.unlockedNodes = [];
    state.newWorld.unlockedNodes.push(nodeId);
    
    log(`BLUEPRINT RESEARCHED: ${PART_CATALOG[node.partId].name}`, "ok");
    saveToServer(); 
    
    renderNewWorld(); 
    if (document.getElementById("tech-wrap").style.display === "block") {
        renderTechTreeCanvas(); 
        selectTechNode(nodeId); 
    }
  // Dieses Snippet ganz am Ende von unlockNode() und buyCraftedPart() einfügen (direkt über der letzten } Klammer):
    const panel = document.getElementById("tech-detail-panel");
    if (panel) {
        panel.classList.remove("flash-buy");
        void panel.offsetWidth; // Zwingt den Browser, die Animation neu zu starten
        panel.classList.add("flash-buy");
    }
}

function buyCraftedPart(nodeId) {
    const node = TECH_TREE[nodeId];
    if(!node) return;
    
    // Checke Kosten: Entweder aus data.js oder die Hardcode-Werte für Exoten
    const reqCp = node.buyCost?.cp || (node.dropOnly ? 200000000000000 : 0); // 200T
    const reqPo = node.buyCost?.po || (node.dropOnly ? 500000 : 0);          // 500k
    const reqVg = node.buyCost?.vg || (node.dropOnly ? 100 : 0);             // 100

    if (state.coins < reqCp || (state.newWorld.po || 0) < reqPo || (state.newWorld.vg || 0) < reqVg) {
        log(node.dropOnly ? "Not enough resources to replicate Exotic!" : "Not enough materials to craft this part!", "bad"); 
        return;
    }
    
    state.coins -= reqCp; 
    state.newWorld.po -= reqPo;
    state.newWorld.vg -= reqVg;
    
    const baseItem = PART_CATALOG[node.partId];
    state.newWorld.inventory.push({ 
        id: "craft_" + Date.now() + "_" + Math.floor(Math.random()*1000), 
        catalogId: node.partId, type: baseItem.type, name: baseItem.name, rarity: baseItem.rarity 
    });
    
    // Coole Log-Nachricht für Exoten
    if (node.dropOnly) {
        log(`EXOTIC REPLICATED: ${baseItem.name} successfully reconstructed.`, "ok");
    } else {
        log(`PRODUCED: ${baseItem.name}`, "ok");
    }
    
    saveToServer(); 
    
    renderNewWorld(); 
    if (document.getElementById("tech-wrap").style.display === "block") {
        selectTechNode(nodeId); 
        
        // Grüner/Pinker Flash
        const panel = document.getElementById("tech-detail-panel");
        if (panel) {
            panel.classList.remove("flash-buy");
            void panel.offsetWidth; 
            panel.classList.add("flash-buy");
        }
    }
}

function tick(){
  const t = now();
  const dt = (t - state.lastTick) / 1000;
  state.lastTick = t;

  const cps = coinsPerSecond(); if(cps > 0) addCoins(cps * dt);
  const rps = rpPerSecond(); if(rps > 0) state.rp += rps * dt;

  // --- NEU: PASSIVES EINKOMMEN AUS DER NEW WORLD ---
  if (state.newWorld && state.newWorld.hangar && state.newWorld.hangar.battery) {
      const batId = state.newWorld.hangar.battery.catalogId;
      const batData = PART_CATALOG[batId];
      
      // Prüfen, ob die Batterie passiv PO generiert (z.B. bat_201)
      if (batData && batData.special && batData.special.type === "passive_income") {
          const passiveGain = batData.special.value * dt; // value (z.B. 10) * verstrichene Sekunden
          state.newWorld.po = (state.newWorld.po || 0) + passiveGain;
      }
  }

  // --- UI UPDATE ---
  el.coins.textContent = fmt(state.coins);
  el.cps.textContent = cps.toFixed(cps<10?2:1);
  el.rp.textContent = fmt(state.rp);

  const nwRpDisplay = document.getElementById("nw-rp-display");
  if (nwRpDisplay) nwRpDisplay.textContent = fmt(state.rp || 0);

  if (state.newWorld && document.getElementById("nw-wrap").style.display === "block") {
      document.getElementById("po-display").textContent = Math.floor(state.newWorld.po || 0);
      document.getElementById("nrp-display").textContent = Math.floor(state.newWorld.nrp || 0);
      document.getElementById("legacy-cp").textContent = fmt(state.coins);
      const vgDisplay = document.getElementById("vg-display");
      if(vgDisplay) vgDisplay.textContent = state.newWorld.vg || 0;

      const m = state.newWorld.mission;
      if (m) {
          const progBar = document.getElementById("mission-progress");
          const timeText = document.getElementById("mission-time");

          if (m.status === "IN_PROGRESS") {
              const elapsed = Date.now() - m.startTime;
              const progress = Math.min(1, elapsed / m.duration);
              
              if (progBar) progBar.style.width = (progress * 100) + "%";
              if (timeText) timeText.textContent = Math.ceil(Math.max(0, m.duration - elapsed) / 1000) + "s";

              if (progress >= 1) {
                  resolveMission(); 
              }
          } else if (m.status === "WAITING_FOR_CLAIM") {
              if (progBar) progBar.style.width = "100%";
              if (timeText) timeText.textContent = m.result.crashed ? "CRASHED" : "SUCCESS";
          }
      } else {
          const progBar = document.getElementById("mission-progress");
          const timeText = document.getElementById("mission-time");
          if(progBar) progBar.style.width = "0%";
          if(timeText) timeText.textContent = "STANDBY";
      }
  }

  if (state.newWorld && document.getElementById("tech-wrap").style.display === "block") {
      const ttCp = document.getElementById("tt-cp"); if(ttCp) ttCp.textContent = fmt(state.coins);
      const ttRp = document.getElementById("tt-rp"); if(ttRp) ttRp.textContent = fmt(state.rp);
      const ttPo = document.getElementById("tt-po"); if(ttPo) ttPo.textContent = Math.floor(state.newWorld.po || 0);
      const ttNrp = document.getElementById("tt-nrp"); if(ttNrp) ttNrp.textContent = Math.floor(state.newWorld.nrp || 0);
      const ttVg = document.getElementById("tt-vg"); if(ttVg) ttVg.textContent = Math.floor(state.newWorld.vg || 0);
  }
}
