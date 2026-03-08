// ---------- DOM HELPERS ----------
const $ = (id) => document.getElementById(id);
const el = {
  coins: $("coins"), cps: $("cps"), clickPow: $("clickPow"),
  rp: $("rp"), rps: $("rps"), life: $("life"),
  clickBtn: $("clickBtn"), experimentBtn: $("experimentBtn"), saveBtn: $("saveBtn"),
  droneList: $("droneList"), techList: $("techList"), cosList: $("cosList"),
  hangar: $("hangar"), log: $("log"),
  statusTag: $("statusTag"), hintLine: $("hintLine"),
};

const droneRows = new Map();
const techRows = new Map();
const cosRows = new Map();

// ---------- UI RENDER FUNKTIONEN ----------
function applyCosmetics(){
  const activeTheme = THEMES.find(t => t.id === state.cosmetics.activeThemeId) || THEMES[0];
  document.documentElement.style.setProperty("--accent", activeTheme.accent);

  const id = "scanlines-style";
  let tag = document.getElementById(id);
  const enabled = !!state.cosmetics.effectsActive.scanlines;
  
  if(enabled && !tag){
      tag = document.createElement("style");
      tag.id = id;
      tag.textContent = `
        body:before{ content:""; position:fixed; inset:0; pointer-events:none; background: repeating-linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(255,255,255,0.08) 1px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 6px); opacity: .65; z-index: 999; }
        body:after{ content:""; position:fixed; inset:0; pointer-events:none; background: radial-gradient(circle at 50% 40%, rgba(255,255,255,0.06), rgba(0,0,0,0) 60%), linear-gradient(to bottom, rgba(255,255,255,0.03), rgba(0,0,0,0.06)); opacity:.45; animation: crtFlicker 2.8s infinite steps(2,end); z-index: 999;}
        @keyframes crtFlicker{ 0%, 100%{ opacity:.40; } 50%{ opacity:.52; } }
      `;
      document.head.appendChild(tag);
  } else if(!enabled && tag) { tag.remove(); }
}

function ensureDroneRow(drone){
  if(droneRows.has(drone.id)) return;
  const row = document.createElement("div"); row.className = "item";
  row.innerHTML = `<div class="itemTop"><div class="itemName">${drone.name}</div><div class="itemMeta" id="dm_${drone.id}"></div></div><div class="itemMeta" style="margin-top:6px;" id="ds_${drone.id}"></div><div class="itemBtns"><button class="mini" id="buy_${drone.id}">BUY</button><button class="mini" id="up_${drone.id}">UPGRADE x2</button></div>`;
  el.droneList.appendChild(row);
  row.querySelector(`#buy_${drone.id}`).addEventListener("click", ()=>{ buyDrone(drone); render(); });
  row.querySelector(`#up_${drone.id}`).addEventListener("click", ()=>{ buyDroneUpgrade(drone); render(); });
  droneRows.set(drone.id, { meta: row.querySelector(`#dm_${drone.id}`), stats: row.querySelector(`#ds_${drone.id}`), buy: row.querySelector(`#buy_${drone.id}`), up: row.querySelector(`#up_${drone.id}`) });
}

function buildTechList(){
  el.techList.innerHTML = "";
  const rpLabRow = document.createElement("div"); rpLabRow.className = "item";
  rpLabRow.innerHTML = `<div class="itemTop"><div class="itemName">RP-Lab (Producer)</div><div class="itemMeta" id="rpl_meta"></div></div><div class="itemMeta" style="margin-top:6px;" id="rpl_stats"></div><div class="itemBtns"><button class="mini" id="rpl_buy">BUY</button></div>`;
  el.techList.appendChild(rpLabRow);
  rpLabRow.querySelector("#rpl_buy").addEventListener("click", ()=>{ buyRpLab(); render(); });
  techRows.set("RPLAB_PRODUCER", { meta: rpLabRow.querySelector("#rpl_meta"), stats: rpLabRow.querySelector("#rpl_stats"), buy: rpLabRow.querySelector("#rpl_buy") });

  for(const t of TECH){
    const row = document.createElement("div"); row.className = "item";
    row.innerHTML = `<div class="itemTop"><div class="itemName">${t.name}</div><div class="itemMeta" id="tm_${t.id}"></div></div><div class="itemMeta" style="margin-top:6px;">${t.desc}</div><div class="itemBtns"><button class="mini" id="tb_${t.id}">BUY</button></div>`;
    el.techList.appendChild(row);
    row.querySelector(`#tb_${t.id}`).addEventListener("click", ()=>{ buyTech(t); render(); });
    techRows.set(t.id, { meta: row.querySelector(`#tm_${t.id}`), buy: row.querySelector(`#tb_${t.id}`) });
  }
}

function buildCosmetics(){
  el.cosList.innerHTML = "";
  for(const th of THEMES){
    const row = document.createElement("div"); row.className = "item";
    row.innerHTML = `<div class="itemTop"><div class="itemName">${th.name}</div><div class="itemMeta" id="thm_${th.id}"></div></div><div class="itemMeta" style="margin-top:6px;">cost: ${fmt(th.cost)} CP</div><div class="itemBtns"><button class="mini" id="thb_buy_${th.id}">BUY</button><button class="mini" id="thb_act_${th.id}">ACTIVATE</button></div>`;
    el.cosList.appendChild(row);
    row.querySelector(`#thb_buy_${th.id}`).addEventListener("click", ()=>{ buyTheme(th); render(); });
    row.querySelector(`#thb_act_${th.id}`).addEventListener("click", ()=>{ activateTheme(th.id); render(); });
    cosRows.set(`theme_${th.id}`, { meta: row.querySelector(`#thm_${th.id}`), buy: row.querySelector(`#thb_buy_${th.id}`), act: row.querySelector(`#thb_act_${th.id}`) });
  }
  
  const VIP_COST = 75_000_000_000;
  const vipRow = document.createElement("div"); vipRow.className = "item";
  vipRow.innerHTML = `<div class="itemTop"><div class="itemName">VIP Badge</div><div class="itemMeta">Cosmetic</div></div><div class="itemMeta" style="margin-top:6px;">Pure flex.</div><div class="itemBtns"><button class="mini" id="vip_buy">BUY (${fmt(VIP_COST)} CP)</button></div>`;
  el.cosList.appendChild(vipRow);
  vipRow.querySelector("#vip_buy").addEventListener("click", ()=>{
    if(state.flags.vipOwned || state.coins < VIP_COST) return;
    state.coins -= VIP_COST; state.flags.vipOwned = true; log("VIP badge acquired.", "ok"); render();
  });

  for(const ef of EFFECTS){
    const row = document.createElement("div"); row.className = "item";
    row.innerHTML = `<div class="itemTop"><div class="itemName">${ef.name}</div><div class="itemMeta" id="efm_${ef.id}"></div></div><div class="itemMeta" style="margin-top:6px;">cost: ${fmt(ef.cost)} CP</div><div class="itemBtns"><button class="mini" id="efb_buy_${ef.id}">BUY</button><button class="mini" id="efb_tog_${ef.id}">TOGGLE</button></div>`;
    el.cosList.appendChild(row);
    row.querySelector(`#efb_buy_${ef.id}`).addEventListener("click", ()=>{ buyEffect(ef); render(); });
    row.querySelector(`#efb_tog_${ef.id}`).addEventListener("click", ()=>{ toggleEffect(ef.id); render(); });
    cosRows.set(`effect_${ef.id}`, { meta: row.querySelector(`#efm_${ef.id}`), buy: row.querySelector(`#efb_buy_${ef.id}`), tog: row.querySelector(`#efb_tog_${ef.id}`) });
  }
}

function renderHangar(){
  el.hangar.innerHTML = "";
  const visible = DRONES.filter(d => isUnlocked(d.unlock) || (state.owned[d.id] || 0) > 0);
  for(const d of visible){
    const owned = state.owned[d.id] || 0;
    const row = document.createElement("div"); row.className = "hangarRow";
    row.innerHTML = `<div class="hangarLeft"><span class="icon">${d.icon}</span><div><div style="font-size:12px;">${d.name}</div><div class="count">owned: x${owned}</div></div></div>`;
    
    const right = document.createElement("div"); right.style = "display:flex;gap:10px;align-items:center;";
    const icons = document.createElement("div"); icons.style = "display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;max-width:220px;";
    
    if(owned <= 30){
      for(let i=0;i<owned;i++){ const ic = document.createElement("span"); ic.className = "icon"; ic.textContent = d.icon; icons.appendChild(ic); }
    } else {
      const ic = document.createElement("span"); ic.className = "icon"; ic.textContent = d.icon; icons.appendChild(ic);
      const cnt = document.createElement("span"); cnt.className = "count"; cnt.textContent = `x${owned}`; icons.appendChild(cnt);
    }

    const nextLocked = DRONES.find(x => !isUnlocked(x.unlock));
    const unlockBar = document.createElement("div"); unlockBar.className = "bar";
    const fill = document.createElement("div"); unlockBar.appendChild(fill);
    if(nextLocked && nextLocked.unlock.type === "owned"){
      const prog = clamp((state.owned[nextLocked.unlock.id] || 0) / nextLocked.unlock.n, 0, 1);
      fill.style.width = `${Math.floor(prog*100)}%`;
    } else { fill.style.width = `100%`; }

    right.appendChild(unlockBar); right.appendChild(icons); row.appendChild(right); el.hangar.appendChild(row);
  }
}

// ---------- NEW WORLD UI & DRAG AND DROP ----------
function enterNewWorld() {
  document.getElementById("game-wrap").style.display = "none";
  document.getElementById("nw-wrap").style.display = "block";
  renderNewWorld();
}

function exitNewWorld() {
  document.getElementById("nw-wrap").style.display = "none";
  document.getElementById("game-wrap").style.display = "block";
  render();
}

function allowDrop(ev) { ev.preventDefault(); }
function dragStart(ev, partId) { ev.dataTransfer.setData("partId", partId); ev.dataTransfer.setData("source", "inventory"); }
function dragStartEquipped(ev, type) { ev.dataTransfer.setData("type", type); ev.dataTransfer.setData("source", "equipped"); }
function dropToSlot(ev, targetType) {
    ev.preventDefault();
    document.getElementById("slot-" + targetType).classList.remove("drag-over");
    if (ev.dataTransfer.getData("source") === "inventory") {
        const partId = ev.dataTransfer.getData("partId");
        const part = state.newWorld.inventory.find(p => p.id === partId);
        if (part && part.type === targetType) { equipPart(partId); } 
        else { log("INCOMPATIBLE PART: Target slot is for " + targetType.toUpperCase(), "warn"); }
    }
}
function dropToInventory(ev) {
    ev.preventDefault();
    if (ev.dataTransfer.getData("source") === "equipped") {
        const type = ev.dataTransfer.getData("type");
        unequipPart(type);
    }
}
function dragEnterSlot(ev, slotEl) { ev.preventDefault(); slotEl.classList.add("drag-over"); }
function dragLeaveSlot(ev, slotEl) { slotEl.classList.remove("drag-over"); }

function renderNewWorld() {
  if (!state || !state.newWorld) return;
    document.getElementById("po-display").textContent = state.newWorld.po || 0;
    document.getElementById("legacy-cp").textContent = fmt(state.coins);
    
    // NRP Anzeige (neu positioniert)
    const nrpDisplay = document.getElementById("nrp-display");
    if(nrpDisplay) nrpDisplay.textContent = state.newWorld.nrp || 0;

    const filterVal = document.getElementById("inv-filter").value;
    let displayItems = [...(state.newWorld.inventory || [])];

    if (filterVal === "sort_rarity") {
        displayItems.sort((a, b) => RARITIES[b.rarity].weight - RARITIES[a.rarity].weight);
    } else if (filterVal.startsWith("type_")) {
        const t = filterVal.split("_")[1];
        displayItems = displayItems.filter(p => p.type === t);
    }

    const invList = document.getElementById("inventory-list");
    invList.innerHTML = "";
    displayItems.forEach(part => {
        const color = RARITIES[part.rarity].color;
        const div = document.createElement("div");
        div.className = "inv-item anim-pop";
        div.draggable = true;
        div.ondragstart = (ev) => dragStart(ev, part.id);
        div.onclick = () => equipPart(part.id); 
        div.innerHTML = `<b style="color: ${color};">${part.rarity}</b><br><span style="color: var(--muted);">${part.type.toUpperCase()}</span><br>${part.name}`;
        invList.appendChild(div);
    });

    const types = ["props", "battery", "frame", "fc", "camera"];
    let partsEquipped = 0;
    const isMissionActive = !!state.newWorld.mission;

    types.forEach(type => {
        const slot = document.getElementById("slot-" + type);
        const equipped = state.newWorld.hangar[type];
        
        slot.style.pointerEvents = isMissionActive ? 'none' : 'auto';
        slot.style.opacity = isMissionActive ? '0.5' : '1';
        
        slot.ondragover = (ev) => allowDrop(ev);
        slot.ondragenter = (ev) => dragEnterSlot(ev, slot);
        slot.ondragleave = (ev) => dragLeaveSlot(ev, slot);
        slot.ondrop = (ev) => dropToSlot(ev, type);
        
        if(equipped) {
            const color = RARITIES[equipped.rarity].color;
            slot.classList.add("filled", "anim-pop");
            slot.draggable = !isMissionActive; 
            slot.ondragstart = (ev) => dragStartEquipped(ev, type);
            slot.innerHTML = `<b style="color: var(--muted);">${type.toUpperCase()}</b><br><span style="color: ${color}">${equipped.name}</span>`;
            slot.onclick = isMissionActive ? null : () => unequipPart(type);
            partsEquipped++;
        } else {
            slot.classList.remove("filled", "anim-pop");
            slot.draggable = false;
            slot.ondragstart = null;
            slot.innerHTML = `${type.toUpperCase()}<br><small>empty</small>`;
            slot.onclick = null;
        }
    });

    const renderField = document.getElementById("drone-render-field");
    const startBtn = document.getElementById("startMissionBtn");
    const progContainer = document.getElementById("mission-progress-container");
    const claimBtn = document.getElementById("claimMissionBtn");
    const isMissionDone = isMissionActive && now() >= state.newWorld.mission.endTime;

    if(isMissionActive) {
        document.querySelectorAll('.inv-item, .part-slot').forEach(elem => {
            elem.style.pointerEvents = 'none';
            if(elem.classList.contains('inv-item')) elem.style.opacity = '0.4';
        });
    }

    if (!isMissionActive) {
        progContainer.style.display = "none"; claimBtn.style.display = "none"; startBtn.style.display = "block";
        if(partsEquipped === 5) {
            renderField.innerHTML = "▀▄▀▄▀ [ DROHNE BEREIT ] ▀▄▀▄▀<br><small style='color: var(--text);'>Wartet auf Freigabe.</small>";
            renderField.style.color = "#00ff88"; 
            startBtn.disabled = false; startBtn.textContent = "START MISSION (Dauer: ~30s)";
            startBtn.style.background = "rgba(255, 68, 68, 0.15)"; startBtn.style.cursor = "pointer";
        } else {
            renderField.innerHTML = "[ SYSTEM OFFLINE ]<br><small>Es fehlen Teile (" + partsEquipped + "/5).</small>";
            renderField.style.color = "var(--warn)"; 
            startBtn.disabled = true; startBtn.textContent = "START MISSION (REQ. 5 PARTS)";
            startBtn.style.background = "transparent"; startBtn.style.cursor = "not-allowed";
        }
    } else {
        startBtn.style.display = "none";
        renderField.innerHTML = ">>> MISSION IN PROGRESS <<< <br><small>Drohne in Sektor 7...</small>";
        renderField.style.color = "var(--warn)";
        
        if (isMissionDone) {
            progContainer.style.display = "none"; claimBtn.style.display = "block";
            if (state.newWorld.mission.crashed) {
                renderField.innerHTML = "!!! CRITICAL CRASH !!!<br><small>Signal verloren. Drohne zerstört.</small>";
                renderField.style.color = "var(--warn)"; claimBtn.textContent = "GO CRY ABOUT IT";
                claimBtn.style.borderColor = "var(--warn)"; claimBtn.style.color = "var(--warn)";
            } else {
                renderField.innerHTML = "[ MISSION COMPLETE ]<br><small>Loot abholbereit.</small>";
                renderField.style.color = "#00ff88"; claimBtn.textContent = "CLAIM LOOT";
                claimBtn.style.borderColor = "#00ff88"; claimBtn.style.color = "#00ff88";
            }
        } else {
            progContainer.style.display = "block"; claimBtn.style.display = "none";
        }
    }
}

function render(){
  const cps = coinsPerSecond(); const rps = rpPerSecond(); const cp = clickPower();
  el.coins.textContent = fmt(state.coins); el.cps.textContent = cps.toFixed(cps<10?2:1);
  el.clickPow.textContent = cp.toFixed(cp<10?2:1); el.rp.textContent = fmt(state.rp);
  el.rps.textContent = rps.toFixed(3); el.life.textContent = fmt(state.lifetimeCoins);
  el.clickBtn.textContent = `CLICK ( +${cp.toFixed(cp<10?2:1)} )`;

  const left = Math.max(0, state.nextExperimentAt - now());
  el.experimentBtn.textContent = left > 0 ? `RUN EXPERIMENT (${Math.ceil(left/1000)}s)` : `RUN EXPERIMENT`;
  el.experimentBtn.disabled = left > 0;

  const next = DRONES.find(d => !isUnlocked(d.unlock));
  el.hintLine.innerHTML = next && next.unlock.type === "owned" ? `Next unlock progress: <span class="tag">${state.owned[next.unlock.id] || 0}/${next.unlock.n}</span> of <span class="tag">${next.unlock.id}</span>.` : "All drones unlocked.";
  
  const vipBadge = document.getElementById("vipBadge");
  if(vipBadge) vipBadge.style.display = state.flags.vipOwned ? "inline" : "none";

  for(const d of DRONES) {
      if(isUnlocked(d.unlock)) ensureDroneRow(d);
      if(!droneRows.has(d.id)) continue;
      const row = droneRows.get(d.id);
      const owned = state.owned[d.id] || 0; const price = dronePrice(d);
      const upLvl = state.dUp[d.id] || 0; const upCost = droneUpgradeCost(d.basePrice, upLvl);
      const per = d.baseCps * droneMultiplier(d.id) * droneCpsMultiplier() * globalCpsMultiplier();
      row.meta.textContent = "unlocked";
      row.stats.textContent = `owned: x${owned} · next: ${fmt(price)} CP · output: ${per.toFixed(per<10?2:1)}/s · upgrade lvl: ${upLvl} (${fmt(upCost)} CP)`;
      row.buy.disabled = state.coins < price; row.up.disabled = (owned<=0) || state.coins < upCost;
  }

  const rpl = techRows.get("RPLAB_PRODUCER");
  rpl.meta.textContent = state.flags.rpLabUnlocked ? "unlocked" : "locked (buy Research Lab tech)";
  rpl.stats.textContent = `owned: x${state.rpLabOwned} · next: ${fmt(rpLabPrice())} CP · output: ${(RP_LAB.baseRps*rpLabMultiplier()).toFixed(3)} RP/s`;
  rpl.buy.disabled = !state.flags.rpLabUnlocked || state.coins < rpLabPrice();

  for(const t of TECH){
    const row = techRows.get(t.id);
    if(t.type === "one"){
      row.meta.textContent = state.techOwned[t.id] ? "owned" : `${t.baseCost} RP`;
      row.buy.disabled = state.techOwned[t.id] || state.rp < t.baseCost;
      row.buy.textContent = state.techOwned[t.id] ? "OWNED" : "BUY";
    } else {
      const cost = techCost(t);
      row.meta.textContent = `lvl ${state.techLvl[t.id] || 0} · cost ${cost} RP`;
      row.buy.disabled = state.rp < cost;
    }
  }

  for(const th of THEMES){
    const row = cosRows.get(`theme_${th.id}`);
    const owned = !!state.cosmetics.themesOwned[th.id]; const active = state.cosmetics.activeThemeId === th.id;
    row.meta.textContent = active ? "active" : (owned ? "owned" : "locked");
    row.buy.disabled = owned || state.coins < th.cost; row.buy.textContent = owned ? "OWNED" : "BUY";
    row.act.disabled = !owned || active; row.act.textContent = active ? "ACTIVE" : "ACTIVATE";
  }

  for(const ef of EFFECTS){
    const row = cosRows.get(`effect_${ef.id}`);
    const owned = !!state.cosmetics.effectsOwned[ef.id]; const on = !!state.cosmetics.effectsActive[ef.id];
    row.meta.textContent = on ? "on" : (owned ? "owned" : "locked");
    row.buy.disabled = owned || state.coins < ef.cost; row.buy.textContent = owned ? "OWNED" : "BUY";
    row.tog.disabled = !owned; row.tog.textContent = on ? "TURN OFF" : "TURN ON";
  }
  
  renderHangar();
  
  const btnNewWorld = document.getElementById("btnNewWorld");
  if(btnNewWorld) btnNewWorld.style.display = state.flags.newWorldUnlocked ? "inline-block" : "none";
}

// ---------- TECH TREE PAN & ZOOM LOGIK ----------
// ---------- TECH TREE PAN & ZOOM LOGIK ----------
let currentTechTab = "battery";
let selectedTechNode = null;
let treeScale = 1;
let treePanX = 0;
let treePanY = 0;
let isTreeDragging = false;
let startDragX, startDragY;
let isPanZoomInitialized = false; // Verhindert doppelte Events

function openTechTree() {
    document.getElementById("nw-wrap").style.display = "none";
    document.getElementById("tech-wrap").style.display = "block";
    
    const container = document.getElementById("tree-container");
    const cWidth = container ? container.clientWidth : window.innerWidth;
    
    // 1. Sanfterer Start-Zoom (Tablet/Handy vs PC)
    treeScale = window.innerWidth < 768 ? 0.45 : 0.75; 
    
    // 2. Kamera exakt auf die Mitte setzen (1500px ist die Mitte der 3000px Canvas)
    treePanX = (cWidth / 2) - (1500 * treeScale);
    treePanY = 40; // Leicht nach unten gerückt
    
    switchTechTab('battery');
    
    setTimeout(() => {
        initTreePanZoom();
        // Erzwingt die korrekte Position direkt beim Öffnen
        const scrollArea = document.querySelector(".tree-scroll-area");
        if(scrollArea) scrollArea.style.transform = `translate(${treePanX}px, ${treePanY}px) scale(${treeScale})`;
    }, 50); 
}

function exitTechTree() {
    document.getElementById("tech-wrap").style.display = "none";
    document.getElementById("nw-wrap").style.display = "block";
    renderNewWorld();
}

function initTreePanZoom() {
    if(isPanZoomInitialized) return;
    isPanZoomInitialized = true;

    const container = document.getElementById("tree-container");
    const scrollArea = document.querySelector(".tree-scroll-area");
    if(!container || !scrollArea) return;

    function applyTransform() {
        scrollArea.style.transform = `translate(${treePanX}px, ${treePanY}px) scale(${treeScale})`;
    }

    // --- MAUS LOGIK (PC) ---
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = Math.exp((e.deltaY < 0 ? 1 : -1) * 0.1);
        
        // ZOOM ZUR BILDSCHIRMMITTE (Hält den Baum zentriert!)
        const centerX = container.clientWidth / 2;
        const centerY = container.clientHeight / 2;
        
        const contentX = (centerX - treePanX) / treeScale;
        const contentY = (centerY - treePanY) / treeScale;

        treeScale *= zoomFactor;
        treeScale = Math.min(Math.max(0.35, treeScale), 1.6); // Min 35%, Max 160%

        treePanX = centerX - (contentX * treeScale);
        treePanY = centerY - (contentY * treeScale);
        applyTransform();
    }, { passive: false });

    container.addEventListener('mousedown', (e) => {
        isTreeDragging = true;
        startDragX = e.clientX - treePanX;
        startDragY = e.clientY - treePanY;
    });
    window.addEventListener('mousemove', (e) => {
        if (!isTreeDragging) return;
        treePanX = e.clientX - startDragX;
        treePanY = e.clientY - startDragY;
        applyTransform();
    });
    window.addEventListener('mouseup', () => isTreeDragging = false);

    // --- TOUCH LOGIK (iPad / Smartphone) ---
    let initialPinchDistance = null;
    let initialPinchScale = 1;

    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) { // 1 Finger: Schieben
            isTreeDragging = true;
            startDragX = e.touches[0].clientX - treePanX;
            startDragY = e.touches[0].clientY - treePanY;
        } else if (e.touches.length === 2) { // 2 Finger: Pinch-to-Zoom
            isTreeDragging = false;
            initialPinchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialPinchScale = treeScale;
        }
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
        e.preventDefault(); // ZWINGEND NÖTIG FÜR iPAD (blockiert Seiten-Scrollen)
        
        if (isTreeDragging && e.touches.length === 1) {
            treePanX = e.touches[0].clientX - startDragX;
            treePanY = e.touches[0].clientY - startDragY;
            applyTransform();
        } else if (e.touches.length === 2 && initialPinchDistance) {
            const currentDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const zoomFactor = currentDist / initialPinchDistance;

            const centerX = container.clientWidth / 2;
            const centerY = container.clientHeight / 2;
            const contentX = (centerX - treePanX) / treeScale;
            const contentY = (centerY - treePanY) / treeScale;

            treeScale = initialPinchScale * zoomFactor;
            treeScale = Math.min(Math.max(0.35, treeScale), 1.6);

            treePanX = centerX - (contentX * treeScale);
            treePanY = centerY - (contentY * treeScale);
            applyTransform();
        }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) initialPinchDistance = null;
        if (e.touches.length === 0) isTreeDragging = false;
    });
}

function switchTechTab(type) {
    currentTechTab = type;
    selectedTechNode = null;
    document.getElementById("tech-detail-panel").innerHTML = `<div style="color: var(--muted);">Wähle einen Knotenpunkt im Tech-Tree aus, um Details zu sehen.</div>`;
    document.querySelectorAll(".tech-nav button").forEach(b => b.classList.remove("active"));
    document.getElementById("tab-" + type).classList.add("active");
    renderTechTreeCanvas();
}

function renderTechTreeCanvas() {
  if (!state || !state.newWorld) return;
    const nodesContainer = document.getElementById("tree-nodes");
    const svgContainer = document.getElementById("tree-lines");
    nodesContainer.innerHTML = "";
    svgContainer.innerHTML = "";

    // --- DYNAMISCHE TIER TRENNLINIEN ---
    const TIER_LINES_CONFIG = {
        battery: [
            { y: 23.5, color: "#00ff88", label: "TIER 2 (RARE)" },
            { y: 44.5, color: "#66d9ff", label: "TIER 3 (SUPER RARE)" },
            { y: 57.5, color: "#ffd700", label: "TIER 4 (LEGENDARY)" },
            { y: 71.0, color: "#ff2da6", label: "TIER 5 (ULTRA RARE)" }
        ],
        props: [
            { y: 22.5, color: "#00ff88", label: "TIER 2 (RARE)" },
            { y: 44.0, color: "#66d9ff", label: "TIER 3 (SUPER RARE)" },
            { y: 61.0, color: "#ffd700", label: "TIER 4 (LEGENDARY)" },
            { y: 74.0, color: "#ff2da6", label: "TIER 5 (ULTRA RARE)" }
        ],
        camera: [
            { y: 24.0, color: "#00ff88", label: "TIER 2 (RARE)" },
            { y: 42.0, color: "#66d9ff", label: "TIER 3 (SUPER RARE)" },
            { y: 62.0, color: "#ffd700", label: "TIER 4 (LEGENDARY)" },
            { y: 82.0, color: "#ff2da6", label: "TIER 5 (ULTRA RARE)" }
        ],
        frame: [
            { y: 19.0, color: "#00ff88", label: "TIER 2 (RARE)" },
            { y: 35.0, color: "#66d9ff", label: "TIER 3 (SUPER RARE)" },
            { y: 62.0, color: "#ffd700", label: "TIER 4 (LEGENDARY)" },
            { y: 77.0, color: "#ff2da6", label: "TIER 5 (ULTRA RARE)" }
        ],
        fc: [
            { y: 24.0, color: "#00ff88", label: "TIER 2 (RARE)" },
            { y: 39.0, color: "#66d9ff", label: "TIER 3 (SUPER RARE)" },
            { y: 56.0, color: "#ffd700", label: "TIER 4 (LEGENDARY)" },
            { y: 76.0, color: "#ff2da6", label: "TIER 5 (ULTRA RARE)" }
        ]
    };

    const tierLines = TIER_LINES_CONFIG[currentTechTab] || [];

    tierLines.forEach(tier => {
        const line = document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('x1', '0%');
        line.setAttribute('y1', `${tier.y}%`);
        line.setAttribute('x2', '100%');
        line.setAttribute('y2', `${tier.y}%`);
        line.setAttribute('stroke', tier.color);
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '12, 12'); 
        line.setAttribute('opacity', '0.2'); 
        svgContainer.appendChild(line);

        const text = document.createElementNS('http://www.w3.org/2000/svg','text');
        text.setAttribute('x', '50%'); 
        text.setAttribute('y', `${tier.y - 0.5}%`); 
        text.setAttribute('fill', tier.color);
        text.setAttribute('opacity', '0.4');
        text.setAttribute('font-size', '28px');
        text.setAttribute('font-family', 'monospace');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('letter-spacing', '6px');
        text.textContent = tier.label;
        svgContainer.appendChild(text);
    });

    const unlocked = state.newWorld.unlockedNodes || [];

    Object.keys(TECH_TREE).forEach(nodeId => {
        const node = TECH_TREE[nodeId];
        if (node.treeType !== currentTechTab) return;

        const part = PART_CATALOG[node.partId];
        const isUnlocked = unlocked.includes(nodeId);
        // Drop-Only Teile können nicht durch Vorbedingungen erreicht werden
        const isReachable = node.dropOnly ? false : (node.req.length === 0 || node.req.some(reqId => unlocked.includes(reqId)));
        
        // --- NEU: Drop-Only Logik (Unbekannt vs. RGB) ---
        let displayName = part.name;
        let nodeColor = RARITIES[part.rarity].color;
        let nodeClass = isUnlocked ? 'unlocked' : (isReachable ? 'reachable' : 'locked');

        if (node.dropOnly) {
            if (!isUnlocked) {
                displayName = "[ ? ] UNKNOWN SIGNAL";
                nodeColor = "#222"; 
                nodeClass = "locked";
            } else {
                nodeClass = "unlocked exotic-rgb"; // RGB ANIMATION
            }
        }

        // Linien zwischen den Nodes
        node.req.forEach(reqId => {
            const parentNode = TECH_TREE[reqId];
            if(parentNode) {
                const line = document.createElementNS('http://www.w3.org/2000/svg','line');
                line.setAttribute('x1', `${parentNode.x}%`);
                line.setAttribute('y1', `${parentNode.y}%`);
                line.setAttribute('x2', `${node.x}%`);
                line.setAttribute('y2', `${node.y}%`);
                line.setAttribute('stroke', isUnlocked ? '#00ff88' : '#333');
                line.setAttribute('stroke-width', '3');
                svgContainer.appendChild(line);
            }
        });

        // Nodes (Boxen) zeichnen
        const el = document.createElement("div");
        el.className = `tree-node ${nodeClass}`;
        el.style.left = `${node.x}%`;
        el.style.top = `${node.y}%`;
        
        el.style.color = nodeColor;
        if (node.dropOnly && !isUnlocked) el.style.borderColor = "#222"; 
        
        el.innerHTML = `<span style="pointer-events:none;">${displayName}</span>`; 
        
        el.onclick = () => selectTechNode(nodeId);
        nodesContainer.appendChild(el);
    });
}

function selectTechNode(nodeId) {
  if (!state || !state.newWorld) return;
    const node = TECH_TREE[nodeId];
    if(!node) return;
    
    const part = PART_CATALOG[node.partId];
    const unlocked = state.newWorld.unlockedNodes || [];
    const isUnlocked = unlocked.includes(nodeId);

    let color = RARITIES[part.rarity].color;

    // --- NEU: Verstecke Info, wenn es ein unentdecktes Drop-Exclusive ist ---
    if (node.dropOnly && !isUnlocked) {
        document.getElementById("tt-detail-title").textContent = "UNKNOWN SIGNAL";
        document.getElementById("tt-detail-title").style.color = "#555";
        document.getElementById("tt-detail-rarity").textContent = "???";
        document.getElementById("tt-detail-rarity").style.color = "#555";
        document.getElementById("tt-detail-stats").innerHTML = "Verschlüsselte Daten...<br>Finde diese Anomalie in einer Mission.";
        
        document.getElementById("tt-detail-btn").innerHTML = `
            <div style="font-size: 11px; color: var(--muted); margin-bottom: 5px;">Source: Unknown</div>
            <button disabled style="border-color: #333; color: #333; width: 100%;">UNDISCOVERED</button>
        `;
        return; // Bricht hier ab, zeigt keine echten Stats an!
    }

    // Normale Titel & Rarity setzen
    document.getElementById("tt-detail-title").textContent = part.name;
    document.getElementById("tt-detail-title").style.color = color;
    document.getElementById("tt-detail-rarity").textContent = part.rarity;
    document.getElementById("tt-detail-rarity").style.color = color;

    // Dynamische Stats generieren
    let statsText = "";
    if (part.type === "battery") statsText = `Missionszeit: ${Math.round(part.timeMult * 100)}%`;
    if (part.type === "props") statsText = `Ertrag: PO x${part.poMult} | N-RP x${part.nrpMult}`;
    if (part.type === "camera") {
        const vgText = part.vgChance > 0 ? ` <br><span style="color:#b300ff">VG-Chance: ${Math.round(part.vgChance * 100)}%</span>` : "";
        statsText = `Loot-Glück: x${part.luckBonus}${vgText}`;
    }
    if (part.type === "frame") statsText = `Absturzrisiko: ${(part.breakChance * 100).toFixed(1)}%`;
    if (part.type === "fc") statsText = `System: ${part.safety > 0 ? 'Stabilisierung aktiv' : 'Pure Software-Logik'}`;

    if (part.special) {
        statsText += `<br><br><span style="color: #00ff88; font-size: 0.9em;">[ Special: ${part.special.type.toUpperCase()} ]</span>`;
    }
    
    document.getElementById("tt-detail-stats").innerHTML = statsText;

    // Dynamische Kosten generieren
    let btnHTML = "";
    
    if (node.dropOnly) {
        // Drop-Only Item das bereits gefunden wurde
        btnHTML = `
            <div style="font-size: 11px; color: var(--muted); margin-bottom: 5px;">Source: Anomaly Drop</div>
            <button disabled style="border-color: #ff2da6; color: #ff2da6; width: 100%;">ACQUIRED</button>
        `;
    } else {
        // Normales Crafting/Research Item
        let craftCost = [];
        if(node.buyCost.cp > 0) craftCost.push(`${fmt(node.buyCost.cp)} CP`);
        if(node.buyCost.po > 0) craftCost.push(`${fmt(node.buyCost.po)} PO`);
        if(node.buyCost.vg > 0) craftCost.push(`${fmt(node.buyCost.vg)} VG`);

        let resCost = [];
        if(node.unlockCost.rp > 0) resCost.push(`${fmt(node.unlockCost.rp)} RP`);
        if(node.unlockCost.nrp > 0) resCost.push(`${fmt(node.unlockCost.nrp)} N-RP`);
        if(node.unlockCost.vg > 0) resCost.push(`${fmt(node.unlockCost.vg)} VG`);

        if (isUnlocked) {
            btnHTML = `
                <div style="font-size: 11px; color: var(--muted); margin-bottom: 5px;">Crafting: ${craftCost.join(' | ')}</div>
                <button onclick="buyCraftedPart('${nodeId}')" style="border-color: ${color}; color: ${color}; width: 100%;">CRAFT PART</button>
            `;
        } else {
            btnHTML = `
                <div style="font-size: 11px; color: var(--muted); margin-bottom: 5px;">Research: ${resCost.join(' | ')}</div>
                <button onclick="unlockNode('${nodeId}')" style="width: 100%;">RESEARCH BLUEPRINT</button>
            `;
        }
    }
    
    document.getElementById("tt-detail-btn").innerHTML = btnHTML;
}
