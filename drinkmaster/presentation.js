const SUPABASE_URL = 'https://usihbregbanpfspblrnw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWhicmVnYmFucGZzcGJscm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDkyNzEsImV4cCI6MjA4NzY4NTI3MX0.U_f2brykxMbegtddye-hpy0lcJgtEzl1AB9lQGpd5UY';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const currentRoomCode = (urlParams.get('room') || '').trim().toUpperCase();

if (!currentRoomCode) window.location.href = 'index.html';

document.getElementById('roomCodeDisplay').innerText = currentRoomCode;
new QRCode(document.getElementById("qrcode"), { 
  text: `https://aenesche.de/drinkmaster/party.html?room=${encodeURIComponent(currentRoomCode)}`, 
  width: 200, height: 200, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H 
});

let currentRoomId = null;
let userDataMap = {}; 
let userDrinksMap = {}; 
let globalReactions = []; 

let isGraphView = false; 
let presentationChart = null; 
let autoSwitchTimer = null; 

// Scroll Variablen
let autoScrollTimer = null;
let scrollDirection = 1; // 1 = rechts, -1 = links
let scrollSpeed = 1;
let scrollPauseTimer = null;

async function initLeaderboard() {
  const { data: roomData } = await client.from('party_rooms').select('id').eq('room_code', currentRoomCode).maybeSingle();
  if (!roomData) { document.getElementById('roomCodeDisplay').innerText = '???'; alert('Raum nicht gefunden!'); return; }
  currentRoomId = roomData.id;

  await loadInitialData();

  // FIX: Kanal pro Raum – vorher steuerte ein Admin ALLE Beamer aller Räume
  client.channel(`party_${currentRoomCode}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'party_drinks', filter: `room_id=eq.${currentRoomId}` }, scheduleReload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'party_reactions', filter: `room_id=eq.${currentRoomId}` }, scheduleReload)
    .on('broadcast', { event: 'autoswitch' }, (payload) => {
      clearInterval(autoSwitchTimer);
      if (payload.payload.active) {
        autoSwitchTimer = setInterval(toggleView, Math.max(3, payload.payload.seconds) * 1000);
      }
    })
    .on('broadcast', { event: 'autoscroll' }, (payload) => {
      clearInterval(autoScrollTimer);
      clearTimeout(scrollPauseTimer);
      if (payload.payload.active) {
        scrollSpeed = payload.payload.speed || 1;
        startAutoScroll();
      }
    })
    .subscribe();
}

// Viele Änderungen kurz hintereinander -> nur einmal neu laden
let reloadTimer = null;
function scheduleReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(loadInitialData, 300);
}

let loadSeq = 0;
async function loadInitialData() {
  const seq = ++loadSeq;
  const [{ data: users }, { data: drinks }, { data: reactions }] = await Promise.all([
    client.from('party_users').select('id, display_name').eq('room_id', currentRoomId),
    client.from('party_drinks').select('*').eq('room_id', currentRoomId).order('created_at', { ascending: true }),
    client.from('party_reactions').select('*, party_users(display_name)').eq('room_id', currentRoomId)
  ]);
  if (seq !== loadSeq) return; // ein neuerer Ladevorgang läuft schon

  userDataMap = {};
  userDrinksMap = {};

  if (users) {
    users.forEach(u => {
      userDataMap[u.id] = { name: u.display_name, score: 0, drinks: 0 };
      userDrinksMap[u.id] = [];
    });
  }

  if (drinks) {
    drinks.forEach(d => {
      if(userDataMap[d.user_id]) {
        userDataMap[d.user_id].score += calculateScore(d.volume_ml, d.alcohol_percent);
        userDataMap[d.user_id].drinks += 1;
        userDrinksMap[d.user_id].push(d);
      }
    });
  }

  globalReactions = reactions || [];

  if (isGraphView) renderGlobalChart(); else renderLeaderboard();
}

function calculateScore(volume, alcPercent) { return volume * (alcPercent / 100); }

function toggleView() {
  isGraphView = !isGraphView;
  const btn = document.getElementById('toggleViewBtn');
  
  if (isGraphView) {
    document.getElementById('live-stats').style.display = 'none';
    document.getElementById('global-chart-container').style.display = 'block';
    btn.innerText = '🍺 Zeige Jenga-Turm';
    btn.style.borderColor = '#00f3ff';
    btn.style.color = '#00f3ff';
    renderGlobalChart();
  } else {
    document.getElementById('live-stats').style.display = 'flex';
    document.getElementById('global-chart-container').style.display = 'none';
    btn.innerText = '📊 Reaktionstests';
    btn.style.borderColor = '#ff00ea';
    btn.style.color = '#ff00ea';
    renderLeaderboard();
  }
}

// Sanftes Ping-Pong Scrollen
function startAutoScroll() {
  const container = document.getElementById('live-stats');
  if (!container) return;

  clearInterval(autoScrollTimer);
  autoScrollTimer = setInterval(() => {
    if (isGraphView) return; 

    let maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll <= 0) return; 

    container.scrollLeft += scrollDirection * scrollSpeed;

    if (scrollDirection === 1 && container.scrollLeft >= maxScroll - 1) {
      scrollDirection = -1;
      pauseAndResumeScroll();
    } else if (scrollDirection === -1 && container.scrollLeft <= 1) {
      scrollDirection = 1;
      pauseAndResumeScroll();
    }
  }, 20); 
}

function pauseAndResumeScroll() {
  clearInterval(autoScrollTimer);
  clearTimeout(scrollPauseTimer);
  scrollPauseTimer = setTimeout(() => { startAutoScroll(); }, 2000); 
}

function renderGlobalChart() {
  const ctx = document.getElementById('globalChart').getContext('2d');
  const CURVE_GROUPING_ML = 15; 

  const scatterData = globalReactions.map(r => ({
    x: r.pure_alcohol_ml, y: r.reaction_time_ms, name: r.party_users?.display_name || 'Unbekannt'
  }));

  let avgCurveData = [];
  let buckets = {};
  globalReactions.forEach(r => {
    let dynamicBucket = Math.floor(r.pure_alcohol_ml / CURVE_GROUPING_ML);
    if (!buckets[dynamicBucket]) buckets[dynamicBucket] = { sumX: 0, sumY: 0, count: 0 };
    buckets[dynamicBucket].sumX += r.pure_alcohol_ml;
    buckets[dynamicBucket].sumY += r.reaction_time_ms;
    buckets[dynamicBucket].count += 1;
  });

  Object.keys(buckets).sort((a,b) => a-b).forEach(bKey => {
    let b = buckets[bKey];
    avgCurveData.push({ x: b.sumX / b.count, y: b.sumY / b.count });
  });

  let lrData = [];
  if (scatterData.length > 1) {
    let n = scatterData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    scatterData.forEach(p => { sumX += p.x; sumY += p.y; sumXY += p.x * p.y; sumXX += p.x * p.x; });
    let denominator = (n * sumXX - sumX * sumX);
    if (denominator !== 0) {
      let m = (n * sumXY - sumX * sumY) / denominator;
      let b = (sumY - m * sumX) / n;
      let minX = 0; let maxX = Math.max(...scatterData.map(p => p.x), 50); 
      lrData = [ { x: minX, y: m * minX + b }, { x: maxX + 20, y: m * (maxX + 20) + b } ];
    }
  }

  if (presentationChart) presentationChart.destroy();

  presentationChart = new Chart(ctx, {
    data: {
      datasets: [
        { type: 'scatter', label: 'Einzelne Tests', data: scatterData, backgroundColor: '#00f3ff', borderColor: '#00f3ff', pointRadius: 7, pointHoverRadius: 10 },
        { type: 'line', label: 'Durchschnittskurve', data: avgCurveData, borderColor: '#ff00ea', backgroundColor: 'transparent', borderWidth: 4, tension: 0.4, pointRadius: 8, pointBackgroundColor: '#ff00ea' },
        { type: 'line', label: 'Trendlinie (Gerade)', data: lrData, borderColor: '#f6e05e', borderDash: [10, 5], backgroundColor: 'transparent', borderWidth: 2, pointRadius: 0, tension: 0 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { type: 'linear', title: { display: true, text: 'Reinalkohol (ml)', color: '#ccc', font: {size: 18, weight: 'bold'} }, grid: { color: '#333' }, ticks: { color: '#aaa', font: {size: 14} } },
        y: { title: { display: true, text: 'Reaktionszeit (ms)', color: '#ccc', font: {size: 18, weight: 'bold'} }, grid: { color: '#333' }, ticks: { color: '#aaa', font: {size: 14} }, beginAtZero: false }
      },
      plugins: {
        legend: { display: true, position: 'top', labels: { color: '#fff', font: { size: 16 }, usePointStyle: true, padding: 20 } },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)', titleFont: { size: 16 }, bodyFont: { size: 14 }, padding: 15,
          callbacks: { label: function(ctx) { if (ctx.datasetIndex === 0) return `${ctx.raw.name}: ${ctx.raw.y} ms (bei ${Math.round(ctx.raw.x)} ml)`; return `${ctx.raw.y.toFixed(0)} ms`; } }
        }
      }
    }
  });
}

function hexToRgb(hex) { let bigint = parseInt(hex.replace('#', ''), 16); return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]; }
function rgbToHex(r, g, b) { return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).padStart(6, '0'); }
function getContinuousColor(alc) {
  const anchors = [ { pct: 0, color: '#00f3ff' }, { pct: 5, color: '#f6e05e' }, { pct: 12, color: '#ed8936' }, { pct: 20, color: '#e53e3e' }, { pct: 40, color: '#ff00ea' } ];
  if (alc <= 0) return anchors[0].color; if (alc >= 40) return anchors[4].color;
  let lower = anchors[0], upper = anchors[1];
  for (let i = 0; i < anchors.length - 1; i++) { if (alc >= anchors[i].pct && alc <= anchors[i+1].pct) { lower = anchors[i]; upper = anchors[i+1]; break; } }
  const t = (alc - lower.pct) / (upper.pct - lower.pct);
  const rgb1 = hexToRgb(lower.color); const rgb2 = hexToRgb(upper.color);
  const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * t); const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * t); const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * t);
  return rgbToHex(r, g, b);
}

// ==========================================
// WICHTIG: DIE SKALIERUNGS-LOGIK
// ==========================================
const MIN_BLOCK_PX = 15;   // Mindesthöhe eines Blocks (vor Skalierung)
function rawBlockHeight(drink) { return Math.max(MIN_BLOCK_PX, drink.volume_ml * 0.2); }

function renderLeaderboard() {
  const container = document.getElementById('live-stats');
  container.innerHTML = '';
  const sortedUserIds = Object.keys(userDataMap).sort((a, b) => userDataMap[b].score - userDataMap[a].score);
  const visibleIds = sortedUserIds.filter(id => userDataMap[id].score > 0 && userDataMap[id].drinks > 0);

  // 1. Verfügbare Höhe messen: Testspalte inkl. Score-Label einhängen
  const probe = document.createElement('div');
  probe.className = 'player-column';
  probe.style.visibility = 'hidden';
  const probeScore = document.createElement('div');
  probeScore.className = 'player-score';
  probeScore.innerText = '999';
  probe.appendChild(probeScore);
  container.appendChild(probe);

  const colStyle = getComputedStyle(probe);
  const scoreStyle = getComputedStyle(probeScore);
  const scoreSpace = probeScore.offsetHeight + parseFloat(scoreStyle.marginTop) + parseFloat(scoreStyle.marginBottom);
  const colInner = probe.clientHeight - parseFloat(colStyle.paddingTop) - parseFloat(colStyle.paddingBottom);
  container.removeChild(probe);

  // Was für den Turm selbst bleibt (+ kleiner Sicherheitsabstand nach oben)
  const available = Math.max(50, colInner - scoreSpace - 10);

  // 2. Abstand zwischen Blöcken: bei sehr vielen Drinks schrumpfen, sonst sprengen allein die Abstände den Bildschirm
  const maxBlocks = Math.max(0, ...visibleIds.map(id => userDrinksMap[id].length));
  let gap = 2;
  if (maxBlocks * 2 > available * 0.25) gap = 1;
  if (maxBlocks * 1 > available * 0.25) gap = 0;

  // 3. Skalierungsfaktor: JEDER Turm (Blöcke + Abstände) muss reinpassen
  //    FIX: früher wurden Abstände und Score-Zahl nicht mitgerechnet -> Türme ragten oben raus
  let scaleFactor = 1;
  visibleIds.forEach(id => {
    const drinks = userDrinksMap[id];
    const rawSum = drinks.reduce((sum, d) => sum + rawBlockHeight(d), 0);
    if (rawSum <= 0) return;
    const fit = (available - drinks.length * gap) / rawSum;
    if (fit < scaleFactor) scaleFactor = fit;
  });
  scaleFactor = Math.max(scaleFactor, 0.01);

  visibleIds.forEach((userId) => {
    const user = userDataMap[userId];
    const drinks = userDrinksMap[userId];

    const col = document.createElement('div');
    col.className = 'player-column';

    // Gesamt-Zahl ganz oben
    const scoreLabel = document.createElement('div');
    scoreLabel.className = 'player-score';
    scoreLabel.innerText = Math.round(user.score);
    col.appendChild(scoreLabel);

    const tower = document.createElement('div');
    tower.className = 'player-tower';

    drinks.forEach(drink => {
      const block = document.createElement('div');
      block.className = 'drink-block';
      block.title = `${drink.volume_ml} ml | ${drink.alcohol_percent}% Vol.`;

      block.style.height = `${rawBlockHeight(drink) * scaleFactor}px`;
      block.style.marginBottom = `${gap}px`;
      if (gap === 0) block.style.borderRadius = '1px';

      let blockW = 40 + (drink.volume_ml / 500) * 70;
      blockW = Math.max(Math.min(blockW, 110), 40);
      block.style.width = `${blockW}px`;

      const hexColor = getContinuousColor(drink.alcohol_percent);
      block.style.backgroundColor = hexColor;
      block.style.boxShadow = `0 0 12px ${hexColor}80`;

      tower.appendChild(block);
    });

    col.appendChild(tower);

    const nameLabel = document.createElement('div');
    nameLabel.className = 'player-name';
    nameLabel.innerText = user.name;
    col.appendChild(nameLabel);

    container.appendChild(col);
  });
}

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (isGraphView) renderGlobalChart(); else renderLeaderboard(); }, 150);
});

initLeaderboard();
