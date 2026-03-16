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
// LOGIK & DATEN
// ==========================================

let currentRoomId = null;
let userDataMap = {}; 
let userDrinksMap = {}; 

async function initLeaderboard() {
  const { data: roomData } = await client.from('party_rooms').select('id').eq('room_code', currentRoomCode).single();
  if (!roomData) return;
  currentRoomId = roomData.id;

  await loadInitialData();

  // WICHTIG: Hört jetzt auf '*', also INSERT (neuer Drink) und DELETE (Admin löscht Drink)
  client.channel('party_drinks_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'party_drinks', filter: `room_id=eq.${currentRoomId}` }, 
      () => { 
        // Egal was passiert ist, lade alles neu und zeichne es perfekt!
        loadInitialData(); 
      }
    ).subscribe();
}

async function loadInitialData() {
  const { data: users } = await client.from('party_users').select('id, display_name').eq('room_id', currentRoomId);
  
  // WICHTIG: Bevor wir neu laden, müssen wir die alten Daten im Speicher löschen, sonst verdoppelt sich alles!
  userDataMap = {};
  userDrinksMap = {};

  if (users) {
    users.forEach(u => {
      userDataMap[u.id] = { name: u.display_name, score: 0 };
      userDrinksMap[u.id] = [];
    });
  }

  const { data: drinks } = await client.from('party_drinks').select('*').eq('room_id', currentRoomId).order('created_at', { ascending: true });
  if (drinks) {
    drinks.forEach(d => {
      if(userDataMap[d.user_id]) {
        userDataMap[d.user_id].score += calculateScore(d.volume_ml, d.alcohol_percent);
        userDrinksMap[d.user_id].push(d);
      }
    });
  }
  renderLeaderboard();
}

function calculateScore(volume, alcPercent) {
  return volume * (alcPercent / 100);
}

// ==========================================
// STUFENLOSE FARBEN (INTERPOLATION)
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
    { pct: 0, color: '#00f3ff' },  // 0% Wasser (Cyan)
    { pct: 5, color: '#f6e05e' },  // 5% Bier (Gelb)
    { pct: 12, color: '#ed8936' }, // 12% Wein/Mische (Orange)
    { pct: 20, color: '#e53e3e' }, // 20% Harte Mische (Rot)
    { pct: 40, color: '#ff00ea' }  // 40%+ Shot (Pink)
  ];

  if (alc <= 0) return anchors[0].color;
  if (alc >= 40) return anchors[4].color;

  let lower = anchors[0], upper = anchors[1];
  for (let i = 0; i < anchors.length - 1; i++) {
    if (alc >= anchors[i].pct && alc <= anchors[i+1].pct) {
      lower = anchors[i]; upper = anchors[i+1]; break;
    }
  }

  const t = (alc - lower.pct) / (upper.pct - lower.pct);
  const rgb1 = hexToRgb(lower.color);
  const rgb2 = hexToRgb(upper.color);

  const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * t);
  const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * t);
  const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * t);

  return rgbToHex(r, g, b);
}

// ==========================================
// RENDERING & AUTO-SCALING
// ==========================================
function renderLeaderboard() {
  const container = document.getElementById('live-stats');
  container.innerHTML = '';

  const sortedUserIds = Object.keys(userDataMap).sort((a, b) => userDataMap[b].score - userDataMap[a].score);

  // 1. Finde den absolut höchsten Turm im Raum (für das Auto-Scaling)
  let maxRawTowerHeight = 0;
  
  sortedUserIds.forEach(userId => {
    let rawHeight = 0;
    userDrinksMap[userId].forEach(drink => {
      let h = Math.max(15, drink.volume_ml * 0.2); 
      rawHeight += h + 2; 
    });
    if (rawHeight > maxRawTowerHeight) maxRawTowerHeight = rawHeight;
  });

  // 2. Skalierungsfaktor berechnen
  const maxAllowedPixels = container.clientHeight * 0.8; 
  let scaleFactor = maxAllowedPixels / (maxRawTowerHeight || 1);
  if (scaleFactor > 1.2) scaleFactor = 1.2; 

  // 3. Türme zeichnen
  sortedUserIds.forEach((userId) => {
    const user = userDataMap[userId];
    const drinks = userDrinksMap[userId];
    if (user.score === 0 || drinks.length === 0) return;

    const col = document.createElement('div');
    col.className = 'player-column';
    col.style.position = 'relative';

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

window.addEventListener('resize', renderLeaderboard);

initLeaderboard();
