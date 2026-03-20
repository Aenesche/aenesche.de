const SUPABASE_URL = 'https://usihbregbanpfspblrnw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWhicmVnYmFucGZzcGJscm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDkyNzEsImV4cCI6MjA4NzY4NTI3MX0.U_f2brykxMbegtddye-hpy0lcJgtEzl1AB9lQGpd5UY';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const currentRoomCode = urlParams.get('room');

if (!currentRoomCode) window.location.href = 'index.html';

document.getElementById('roomCodeDisplay').innerText = currentRoomCode;
new QRCode(document.getElementById("qrcode"), { 
  text: `https://aenesche.de/drinkmaster/party.html?room=${currentRoomCode}`, 
  width: 200, height: 200, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H 
});

// ==========================================
// GLOBALE VARIABLEN & DATEN
// ==========================================
let currentRoomId = null;
let userDataMap = {}; 
let userDrinksMap = {}; 
let globalReactions = []; // NEU: Alle Reaktionen

let isGraphView = false; // Toggle-Zustand
let presentationChart = null; // Chart.js Instanz

async function initLeaderboard() {
  const { data: roomData } = await client.from('party_rooms').select('id').eq('room_code', currentRoomCode).single();
  if (!roomData) return;
  currentRoomId = roomData.id;

  await loadInitialData();

  // WICHTIG: Hört jetzt auf Drinks UND auf Reactions! Egal was passiert -> Neu laden
  client.channel('party_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'party_drinks', filter: `room_id=eq.${currentRoomId}` }, () => { loadInitialData(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'party_reactions', filter: `room_id=eq.${currentRoomId}` }, () => { loadInitialData(); })
    .subscribe();
}

async function loadInitialData() {
  // 1. User holen
  const { data: users } = await client.from('party_users').select('id, display_name').eq('room_id', currentRoomId);
  userDataMap = {};
  userDrinksMap = {};

  if (users) {
    users.forEach(u => {
      userDataMap[u.id] = { name: u.display_name, score: 0 };
      userDrinksMap[u.id] = [];
    });
  }

  // 2. Drinks holen
  const { data: drinks } = await client.from('party_drinks').select('*').eq('room_id', currentRoomId).order('created_at', { ascending: true });
  if (drinks) {
    drinks.forEach(d => {
      if(userDataMap[d.user_id]) {
        userDataMap[d.user_id].score += calculateScore(d.volume_ml, d.alcohol_percent);
        userDrinksMap[d.user_id].push(d);
      }
    });
  }

  // 3. NEU: Alle Reaktionen inkl. User-Namen holen
  const { data: reactions } = await client.from('party_reactions').select('*, party_users(display_name)').eq('room_id', currentRoomId);
  globalReactions = reactions || [];

  // Nur die aktive Ansicht neu zeichnen
  if (isGraphView) {
    renderGlobalChart();
  } else {
    renderLeaderboard();
  }
}

function calculateScore(volume, alcPercent) { return volume * (alcPercent / 100); }

// ==========================================
// VIEW TOGGLE LOGIK
// ==========================================
function toggleView() {
  isGraphView = !isGraphView;
  const btn = document.getElementById('toggleViewBtn');
  
  if (isGraphView) {
    document.getElementById('live-stats').style.display = 'none';
    document.getElementById('global-chart-container').style.display = 'block';
    btn.innerText = 'Zurrück 🍺';
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

// ==========================================
// ANSICHT 2: GLOBALER SCATTER PLOT
// ==========================================
function renderGlobalChart() {
  const ctx = document.getElementById('globalChart').getContext('2d');

  // 1. Die Wolke (Scatter Plot)
  const scatterData = globalReactions.map(r => ({
    x: r.pure_alcohol_ml,
    y: r.reaction_time_ms,
    name: r.party_users?.display_name || 'Unbekannt'
  }));

  // 2. Durchschnittskurve (Gruppiert nach Bucket)
  let avgCurveData = [];
  let buckets = {};
  globalReactions.forEach(r => {
    if (!buckets[r.alcohol_bucket]) buckets[r.alcohol_bucket] = { sumX: 0, sumY: 0, count: 0 };
    buckets[r.alcohol_bucket].sumX += r.pure_alcohol_ml;
    buckets[r.alcohol_bucket].sumY += r.reaction_time_ms;
    buckets[r.alcohol_bucket].count += 1;
  });

  Object.keys(buckets).sort((a,b) => a-b).forEach(bKey => {
    let b = buckets[bKey];
    avgCurveData.push({ x: b.sumX / b.count, y: b.sumY / b.count });
  });

  // 3. Trendlinie (Lineare Regression - Gerade)
  let lrData = [];
  if (scatterData.length > 1) {
    let n = scatterData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    scatterData.forEach(p => {
      sumX += p.x; sumY += p.y;
      sumXY += p.x * p.y; sumXX += p.x * p.x;
    });
    
    // Verhindert Mathe-Fehler, wenn alle auf der selben Linie liegen
    let denominator = (n * sumXX - sumX * sumX);
    if (denominator !== 0) {
      let m = (n * sumXY - sumX * sumY) / denominator;
      let b = (sumY - m * sumX) / n;
      
      let minX = 0;
      let maxX = Math.max(...scatterData.map(p => p.x), 50); // Mindestens bis 50ml zeichnen
      lrData = [ { x: minX, y: m * minX + b }, { x: maxX + 20, y: m * (maxX + 20) + b } ];
    }
  }

  // Alten Graphen löschen, falls existent
  if (presentationChart) presentationChart.destroy();

  // Neuen Graphen zeichnen
  presentationChart = new Chart(ctx, {
    data: {
      datasets: [
        {
          type: 'scatter',
          label: 'Einzelne Tests',
          data: scatterData,
          backgroundColor: '#00f3ff', // Cyan
          borderColor: '#00f3ff',
          pointRadius: 7,
          pointHoverRadius: 10,
        },
        {
          type: 'line',
          label: 'Durchschnittskurve',
          data: avgCurveData,
          borderColor: '#ff00ea', // Pink
          backgroundColor: 'transparent',
          borderWidth: 4,
          tension: 0.4, // Geschwungene Linie
          pointRadius: 8,
          pointBackgroundColor: '#ff00ea'
        },
        {
          type: 'line',
          label: 'Trendlinie (Gerade)',
          data: lrData,
          borderColor: '#f6e05e', // Gelb
          borderDash: [10, 5], // Gestrichelt
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0 // Komplett gerade
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Reinalkohol (ml)', color: '#ccc', font: {size: 18, weight: 'bold'} },
          grid: { color: '#333' },
          ticks: { color: '#aaa', font: {size: 14} }
        },
        y: {
          title: { display: true, text: 'Reaktionszeit (Millisekunden)', color: '#ccc', font: {size: 18, weight: 'bold'} },
          grid: { color: '#333' },
          ticks: { color: '#aaa', font: {size: 14} },
          beginAtZero: false
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: '#fff', font: { size: 16 }, usePointStyle: true, padding: 20 }
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleFont: { size: 16 },
          bodyFont: { size: 14 },
          padding: 15,
          callbacks: {
            label: function(ctx) {
              // Zeigt den Namen der Person beim drüberfahren (Scatter)
              if (ctx.datasetIndex === 0) return `${ctx.raw.name}: ${ctx.raw.y} ms (bei ${Math.round(ctx.raw.x)} ml)`;
              return `${ctx.raw.y.toFixed(0)} ms`;
            }
          }
        }
      }
    }
  });
}

// ==========================================
// ANSICHT 1: JENGA TURM (Alte Logik)
// ==========================================
function hexToRgb(hex) {
  let bigint = parseInt(hex.replace('#', ''), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}
function rgbToHex(r, g, b) {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).padStart(6, '0');
}
function getContinuousColor(alc) {
  const anchors = [
    { pct: 0, color: '#00f3ff' }, { pct: 5, color: '#f6e05e' }, { pct: 12, color: '#ed8936' }, { pct: 20, color: '#e53e3e' }, { pct: 40, color: '#ff00ea' }
  ];
  if (alc <= 0) return anchors[0].color;
  if (alc >= 40) return anchors[4].color;
  let lower = anchors[0], upper = anchors[1];
  for (let i = 0; i < anchors.length - 1; i++) {
    if (alc >= anchors[i].pct && alc <= anchors[i+1].pct) { lower = anchors[i]; upper = anchors[i+1]; break; }
  }
  const t = (alc - lower.pct) / (upper.pct - lower.pct);
  const rgb1 = hexToRgb(lower.color); const rgb2 = hexToRgb(upper.color);
  const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * t);
  const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * t);
  const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * t);
  return rgbToHex(r, g, b);
}

function renderLeaderboard() {
  const container = document.getElementById('live-stats');
  container.innerHTML = '';
  const sortedUserIds = Object.keys(userDataMap).sort((a, b) => userDataMap[b].score - userDataMap[a].score);

  let maxRawTowerHeight = 0;
  sortedUserIds.forEach(userId => {
    let rawHeight = 0;
    userDrinksMap[userId].forEach(drink => { rawHeight += Math.max(15, drink.volume_ml * 0.2) + 2; });
    if (rawHeight > maxRawTowerHeight) maxRawTowerHeight = rawHeight;
  });

  const maxAllowedPixels = container.clientHeight * 0.8; 
  let scaleFactor = maxAllowedPixels / (maxRawTowerHeight || 1);
  if (scaleFactor > 1.2) scaleFactor = 1.2; 

  sortedUserIds.forEach((userId) => {
    const user = userDataMap[userId];
    const drinks = userDrinksMap[userId];
    if (user.score === 0 || drinks.length === 0) return;

    const col = document.createElement('div');
    col.className = 'player-column';
    
    const scoreLabel = document.createElement('div');
    scoreLabel.className = 'player-score';
    scoreLabel.innerText = Math.round(user.score);
    col.appendChild(scoreLabel);

    const tower = document.createElement('div');
    tower.className = 'player-tower';

    drinks.forEach(drink => {
      const block = document.createElement('div');
      block.className = 'drink-block';
      
      let rawH = Math.max(15, drink.volume_ml * 0.2);
      block.style.height = `${rawH * scaleFactor}px`;
      
      let blockW = 40 + (drink.volume_ml / 500) * 80;
      const maxColWidth = (container.clientWidth / sortedUserIds.length) - 4; 
      
      blockW = Math.min(blockW, maxColWidth); 
      if (blockW < 8) blockW = 8; 
      
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

window.addEventListener('resize', () => {
  if (isGraphView) renderGlobalChart(); else renderLeaderboard();
});

initLeaderboard();
