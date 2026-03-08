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

    // 1. Basis-Zeit berechnen (30 Sekunden * Batterie-Multiplikator)
    let timeMult = bat.timeMult;
    
    // Specials, die die Zeit beeinflussen
    if (PART_CATALOG[h.frame.catalogId].special?.type === "heavyweight") timeMult *= 1.5; // Juggernaut Frame
    if (PART_CATALOG[h.fc.catalogId].special?.type === "agility_boost") timeMult *= 0.95; // F3 Acro FC

    let durationMs = 30000 * timeMult;

    // Chrono-Stutter Exot: 10% Chance auf Instant-Mission!
    if (props.special?.type === "instant_mission" && Math.random() < props.special.value) {
        durationMs = 0;
        log("CHRONO-STUTTER TRIGGERED! Instant jump completed.", "ok");
    }

    state.newWorld.mission = {
        startTime: Date.now(),
        duration: durationMs,
        completed: false
    };

    log("Drone launched into the wasteland!", "ok");
    saveToServer();
    renderNewWorld();
}

function resolveMission() {
    const h = state.newWorld.hangar;
    const bat = PART_CATALOG[h.battery.catalogId];
    const frame = PART_CATALOG[h.frame.catalogId];
    const props = PART_CATALOG[h.props.catalogId];
    const cam = PART_CATALOG[h.camera.catalogId];
    const fc = PART_CATALOG[h.fc.catalogId];

    // --- 1. SYNERGIEN & MULTIPLIKATOREN SAMMELN ---
    let luck = cam.luckBonus;
    let vgChance = cam.vgChance || 0;
    let crashRisk = frame.breakChance;

    // DJI Synergien checken
    if (fc.special?.type === "set_bonus_v1" && cam.special?.type === "synergy_ready" && cam.special.value === "v1") luck *= fc.special.value;
    if (fc.special?.type === "set_bonus_o3" && cam.special?.type === "synergy_ready" && cam.special.value === "o3") luck *= fc.special.value;

    // Weitere Specials sammeln
    if (bat.special?.type === "void_find") vgChance += bat.special.value;
    if (frame.special?.type === "void_find") vgChance += frame.special.value;
    if (fc.special?.type === "luck_boost") luck += fc.special.value;
    if (bat.special?.type === "burnout_risk") crashRisk += bat.special.value;
    if (props.special?.type === "burnout_risk" || props.special?.type === "break_risk") crashRisk += props.special.value;
    if (fc.special?.type === "auto_level") crashRisk = Math.max(0, crashRisk - fc.special.value);

    // --- 2. DER CRASH-WÜRFEL ---
    const isCrash = Math.random() < crashRisk;

    if (isCrash) {
        // Phoenix Alloy Special (10% Chance, Crash zu ignorieren)
        if (frame.special?.type === "rebirth" && Math.random() < frame.special.value) {
            log("PHOENIX ALLOY ACTIVATED! Lethal crash averted.", "ok");
        } else {
            // Echter Crash! Was passiert mit den Bauteilen?
            let savedPartsCount = 0;
            if (fc.special?.type === "rth_flawless" || bat.special?.type === "save_parts" || frame.special?.type === "save_parts") {
                savedPartsCount = 5; // Alles gerettet!
                log("CRASH! But emergency systems saved all parts.", "warn");
            } else if (fc.special?.type === "rth_v2") {
                savedPartsCount = 3;
            } else if (fc.special?.type === "rth_v1") {
                savedPartsCount = 1;
            }

            if (savedPartsCount < 5) {
                // Teile zufällig zerstören (simpel gehalten: Wir leeren den Hangar teilweise)
                const partKeys = ["battery", "frame", "props", "camera", "fc"];
                // Mische die Keys, um zufällige Teile zu retten
                partKeys.sort(() => 0.5 - Math.random()); 
                
                let destroyedCount = 0;
                for (let i = savedPartsCount; i < 5; i++) {
                    const keyToDestroy = partKeys[i];
                    if (state.newWorld.hangar[keyToDestroy]) {
                        // Lösche das Item auch aus dem Inventar!
                        const invId = state.newWorld.hangar[keyToDestroy].id;
                        state.newWorld.inventory = state.newWorld.inventory.filter(item => item.id !== invId);
                        state.newWorld.hangar[keyToDestroy] = null;
                        destroyedCount++;
                    }
                }
                log(`CRASH! Drone destroyed. ${destroyedCount} parts lost in the wasteland.`, "bad");

                // Insurance Fraud Exot (Gibt massiv CP und VG bei Zerstörung)
                if (fc.special?.type === "insurance_fraud") {
                    state.coins += 1000e12; 
                    state.newWorld.vg += 50;
                    log("INSURANCE FRAUD: Received massive payout for destroyed parts!", "ok");
                }
            }

            // Blackbox Exot (Rettet N-RP trotz Crash)
            if (fc.special?.type === "blackbox") {
                const recoveredNrp = Math.floor(10 * props.nrpMult * fc.special.value);
                state.newWorld.nrp += recoveredNrp;
                log(`Blackbox recovered ${recoveredNrp} N-RP from the wreckage.`, "ok");
            }

            state.newWorld.mission = null;
            saveToServer();
            renderNewWorld();
            return; // Mission endet hier nach dem Crash!
        }
    }

    // --- 3. ERFOLGREICHE MISSION (RESSOURCEN ERNTEN) ---
    // Basis-Werte (Später skalierbar, aktuell fix für den Test)
    let basePo = Math.floor(Math.random() * 50) + 10; 
    let baseNrp = Math.floor(Math.random() * 5) + 1;

    let totalPo = basePo * props.poMult;
    let totalNrp = baseNrp * props.nrpMult;

    // FC Overclock & Props Exoten
    if (fc.special?.type === "overclock_po") totalPo *= (1 + fc.special.value);
    if (props.special?.type === "double_po") totalPo *= 2;
    if (bat.special?.type === "double_loot") { totalPo *= 2; totalNrp *= 2; luck *= 2; }
    
    // Neural-Overload Exot (Konvertiert alles PO in N-RP)
    if (props.special?.type === "po_to_nrp") {
        totalNrp += totalPo;
        totalPo = 0;
    }

    state.newWorld.po += totalPo;
    state.newWorld.nrp += totalNrp;

    // Void Gems würfeln
    let vgFound = 0;
    if (Math.random() < vgChance) {
        vgFound = 1;
        if (props.special?.type === "double_vg") vgFound *= 2;
        state.newWorld.vg += vgFound;
    }

    // --- 4. LOOT DROP (ANOMALIEN) ---
    let lootMessage = `Mission Success! +${fmt(totalPo)} PO | +${fmt(totalNrp)} N-RP`;
    if (vgFound > 0) lootMessage += ` | +${vgFound} VOID GEMS!`;

    // Simpler RNG für Drops: Je mehr Luck, desto höher die Chance auf einen Drop überhaupt.
    // Bei Luck 100 ist ein Drop quasi garantiert.
    const dropChance = Math.min(1.0, 0.05 * luck); 
    
    if (Math.random() < dropChance && cam.special?.type !== "no_parts") {
        // Wir filtern alle verfügbaren Drop-Exclusives aus dem Tech-Tree
        const dropNodes = Object.keys(TECH_TREE).filter(key => TECH_TREE[key].dropOnly);
        
        // 2% Basis-Chance für ein ultra-seltenes Drop-Exclusive (modifiziert durch Luck)
        const exclusiveChance = Math.min(0.02, 0.0001 * luck); 

        if (dropNodes.length > 0 && Math.random() < exclusiveChance) {
            // JACKPOT! Ein Drop-Exclusive wurde gefunden.
            const randomDropId = dropNodes[Math.floor(Math.random() * dropNodes.length)];
            
            // Wenn wir es noch nicht hatten, schalten wir es im Tech-Tree frei!
            if (!state.newWorld.unlockedNodes.includes(randomDropId)) {
                state.newWorld.unlockedNodes.push(randomDropId);
                log(`ANOMALY DISCOVERED! You unlocked a new Blueprint Signal!`, "ok");
            }
            
            // Ins Inventar legen
            const part = PART_CATALOG[TECH_TREE[randomDropId].partId];
            state.newWorld.inventory.push({ 
                id: "drop_" + Date.now(), 
                catalogId: TECH_TREE[randomDropId].partId, type: part.type, name: part.name, rarity: part.rarity 
            });
            lootMessage += `\n>> ACQUIRED EXOTIC PART: ${part.name} <<`;
        } else {
            // Normaler Schrott-Drop (Common/Rare) für den Hangar
            // Hier könnten wir später eine Liste mit normalen Teilen generieren, für jetzt geben wir einfach Extra-Ressourcen:
            state.newWorld.po += 500e12;
            lootMessage += " (Found Scrap Metal: +500T PO)";
        }
    }

    log(lootMessage, "ok");
    state.newWorld.mission = null;
    saveToServer();
    renderNewWorld();
}

function claimMissionResult() {
    if (!state.newWorld.mission || now() < state.newWorld.mission.endTime) return;
    const m = state.newWorld.mission;
    if (m.crashed) {
        log(`CRITICAL FAILURE! Drone crashed. All equipped parts LOST.`, "bad");
        state.newWorld.hangar = { frame: null, props: null, battery: null, fc: null, camera: null };
    } else {
        state.newWorld.po = (state.newWorld.po || 0) + m.poGained;
        state.newWorld.nrp = (state.newWorld.nrp || 0) + m.nrpGained; 
        m.drops.forEach(d => state.newWorld.inventory.push(d));
        log(`MISSION SUCCESS! Extracted +${m.poGained} PO & +${m.nrpGained} N-RP.`, "ok");
        m.drops.forEach(d => log(`LOOT DROP: ${d.name} (${d.rarity})`, "ok"));
    }
    state.newWorld.mission = null;
    saveToServer(); renderNewWorld();
}

function unlockNode(nodeId) {
    const node = TECH_TREE[nodeId];
    if(!node) return;
    
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
}

function buyCraftedPart(nodeId) {
    const node = TECH_TREE[nodeId];
    if(!node) return;
    
    const reqCp = node.buyCost.cp || 0;
    const reqPo = node.buyCost.po || 0;
    const reqVg = node.buyCost.vg || 0;

    if (state.coins < reqCp || (state.newWorld.po || 0) < reqPo || (state.newWorld.vg || 0) < reqVg) {
        log("Not enough materials to craft this part!", "bad"); return;
    }
    
    state.coins -= reqCp; 
    state.newWorld.po -= reqPo;
    state.newWorld.vg -= reqVg;
    
    const baseItem = PART_CATALOG[node.partId];
    state.newWorld.inventory.push({ 
        id: "craft_" + Date.now() + "_" + Math.floor(Math.random()*1000), 
        catalogId: node.partId, type: baseItem.type, name: baseItem.name, rarity: baseItem.rarity 
    });
    
    log(`PRODUCED: ${baseItem.name}`, "ok");
    saveToServer(); 
    
    renderNewWorld(); 
    if (document.getElementById("tech-wrap").style.display === "block") selectTechNode(nodeId); 
}
function buyEmergencyKit() {
    const cost = 10000000000000; 
    if (state.coins < cost) { log(`Not enough CP! Need ${fmt(cost)} CP for an Emergency Kit.`, "bad"); return; }
    state.coins -= cost;
    const starterParts = ["fr_com_1", "pr_com_1", "ba_com_1", "ca_com_1", "fc_com_1"];
    starterParts.forEach(catalogId => {
        const baseItem = PART_CATALOG[catalogId];
        state.newWorld.inventory.push({ id: "inst_" + Date.now() + "_" + Math.floor(Math.random()*1000), catalogId: catalogId, type: baseItem.type, name: baseItem.name, rarity: baseItem.rarity });
    });
    log("EMERGENCY KIT acquired! (+5 Common Parts)", "warn");
    saveToServer(); renderNewWorld();
}

function tick(){
  const t = now();
  const dt = (t - state.lastTick) / 1000;
  state.lastTick = t;

  const cps = coinsPerSecond(); if(cps > 0) addCoins(cps * dt);
  const rps = rpPerSecond(); if(rps > 0) state.rp += rps * dt;

  el.coins.textContent = fmt(state.coins);
  el.cps.textContent = cps.toFixed(cps<10?2:1);
  el.rp.textContent = fmt(state.rp);

  if (state.newWorld && document.getElementById("nw-wrap").style.display === "block") {
      document.getElementById("po-display").textContent = Math.floor(state.newWorld.po || 0);
      document.getElementById("nrp-display").textContent = Math.floor(state.newWorld.nrp || 0);
      document.getElementById("legacy-cp").textContent = fmt(state.coins);

      const m = state.newWorld.mission;
      if (m) {
          const now = Date.now();
          const elapsed = now - m.startTime;
          let progress = elapsed / m.duration;
          
          if (progress >= 1) {
              // Mission ist fertig!
              document.getElementById("mission-progress").style.width = "100%";
              document.getElementById("mission-time").textContent = "RETURNED";
              
              if (!m.completed) {
                  m.completed = true; // Verhindert doppeltes Auslösen
                  resolveMission();   // Löst Crash, Loot und Specials aus!
              }
          } else {
              // Mission läuft noch
              document.getElementById("mission-progress").style.width = (progress * 100) + "%";
              const leftSec = Math.ceil((m.duration - elapsed) / 1000);
              document.getElementById("mission-time").textContent = leftSec + "s";
          }
      } else {
          // Keine aktive Mission
          document.getElementById("mission-progress").style.width = "0%";
          document.getElementById("mission-time").textContent = "STANDBY";
      }
  }
  // NEU: Live-Update für die Tech-Tree Kopfzeile
    if (state.newWorld && document.getElementById("tech-wrap").style.display === "block") {
        const ttCp = document.getElementById("tt-cp"); if(ttCp) ttCp.textContent = fmt(state.coins);
        const ttRp = document.getElementById("tt-rp"); if(ttRp) ttRp.textContent = fmt(state.rp);
        const ttPo = document.getElementById("tt-po"); if(ttPo) ttPo.textContent = Math.floor(state.newWorld.po || 0);
        const ttNrp = document.getElementById("tt-nrp"); if(ttNrp) ttNrp.textContent = Math.floor(state.newWorld.nrp || 0);
        const ttVg = document.getElementById("tt-vg"); if(ttVg) ttVg.textContent = Math.floor(state.newWorld.vg || 0);
    }
}
