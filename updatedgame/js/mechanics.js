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
function startMission() {
    if (state.newWorld.mission) return;
    const types = ["props", "battery", "frame", "fc", "camera"];
    for (let t of types) { if (!state.newWorld.hangar[t]) return; }

    const frame = PART_CATALOG[state.newWorld.hangar.frame.catalogId] || PART_CATALOG["fr_com_1"];
    const fc = PART_CATALOG[state.newWorld.hangar.fc?.catalogId] || PART_CATALOG["fc_com_1"];
    const props = PART_CATALOG[state.newWorld.hangar.props?.catalogId] || PART_CATALOG["pr_com_1"];
    const cam = PART_CATALOG[state.newWorld.hangar.camera?.catalogId] || PART_CATALOG["ca_com_1"];
    const batt = PART_CATALOG[state.newWorld.hangar.battery?.catalogId] || PART_CATALOG["ba_com_1"];

    const duration = BASE_MISSION_DURATION * (batt ? batt.timeMult : 1.0);
    const risk = Math.max(0, frame.breakChance - (fc ? fc.safety : 0));
    const crashRoll = Math.random();
    const crashed = crashRoll < risk;

    let poGained = 0; let nrpGained = 0; let drops = [];
    if (!crashed) {
        let basePo = Math.floor(Math.random() * 11) + 5;
        poGained = Math.floor(basePo * (props ? props.poMult : 1.0));
        nrpGained = Math.floor(Math.random() * 3) + 1; 
        const luck = cam ? cam.luckBonus : 1.0;
        const dropsCount = Math.floor(Math.random() * 2) + 1;
        for(let i=0; i<dropsCount; i++) drops.push(generateLootDrop(luck));
    }

    state.newWorld.mission = { endTime: now() + duration, duration: duration, crashed: crashed, risk: risk, poGained: poGained, nrpGained: nrpGained, drops: drops };
    log(`SERVER: Mission started. ETA: ${Math.ceil(duration/1000)}s`, "warn");

    const grid = document.querySelector(".drone-grid");
    grid.classList.add("anim-takeoff");
    setTimeout(() => { grid.classList.remove("anim-takeoff"); }, duration);
  
    saveToServer(); renderNewWorld();
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
          const leftMs = m.endTime - t;
          if (leftMs <= 0) {
              if (document.getElementById("claimMissionBtn").style.display === "none") { renderNewWorld(); }
          } else {
              const passed = m.duration - leftMs;
              const percent = Math.min(100, (passed / m.duration) * 100);
              document.getElementById("mission-progress-fill").style.width = percent + "%";
              document.getElementById("mission-timer-text").textContent = "FLIGHT TIME REMAINING: " + Math.ceil(leftMs/1000) + "s";
          }
      }
  }
}
