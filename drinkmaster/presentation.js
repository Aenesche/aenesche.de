// Deine echten Supabase Keys!
const SUPABASE_URL = 'https://usihbregbanpfspblrnw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWhicmVnYmFucGZzcGJscm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDkyNzEsImV4cCI6MjA4NzY4NTI3MX0.U_f2brykxMbegtddye-hpy0lcJgtEzl1AB9lQGpd5UY';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const currentRoomCode = urlParams.get('room');

if (!currentRoomCode) {
  window.location.href = 'index.html';
}

// UI Setup
document.getElementById('roomCodeDisplay').innerText = currentRoomCode;
const joinUrl = `https://aenesche.de/drinkmaster/party.html?room=${currentRoomCode}`;
new QRCode(document.getElementById("qrcode"), { text: joinUrl, width: 200, height: 200, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H });

// ==========================================
// LIVE LEADERBOARD (TOWER-LOGIK)
// ==========================================

let currentRoomId = null;
let userDataMap = {}; // Speichert Name und Score
let userDrinksMap = {}; // Speichert Arrays mit allen Drinks pro User

async function initLeaderboard() {
  const { data: roomData } = await client.from('party_rooms').select('id').eq('room_code', currentRoomCode).single();
  if (!roomData) return;
  currentRoomId = roomData.id;

  await loadInitialData();

  client.channel('party_drinks_channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'party_drinks', filter: `room_id=eq.${currentRoomId}` }, 
      (payload) => { handleNewDrink(payload.new); }
    ).subscribe();
}

async function loadInitialData() {
  const { data: users } = await client.from('party_users').select('id, display_name').eq('room_id', currentRoomId);
  if (users) {
    users.forEach(u => {
      userDataMap[u.id] = { name: u.display_name, score: 0 };
      userDrinksMap[u.id] = [];
    });
  }

  // WICHTIG: Order by created_at, damit wir richtig stapeln (ältester Drink unten)
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

// Farben je nach Alkoholgehalt
function getColorForAlcohol(alc) {
  if (alc <= 0) return '#63b3ed'; // 0% Wasser -> Hellblau
  if (alc <= 6) return '#f6e05e'; // ~5% Bier -> Gelb
  if (alc <= 15) return '#ed8936'; // ~12% Wein -> Orange
  if (alc <= 25) return '#e53e3e'; // ~20% Mische -> Rot
  return '#d53f8c'; // > 25% Shots -> Pink/Neon
}

async function handleNewDrink(drinkData) {
  if (!userDataMap[drinkData.user_id]) {
    const { data: uData } = await client.from('party_users').select('display_name').eq('id', drinkData.user_id).single();
    userDataMap[drinkData.user_id] = { name: uData?.display_name || "Unbekannt", score: 0 };
    userDrinksMap[drinkData.user_id] = [];
  }

  userDataMap[drinkData.user_id].score += calculateScore(drinkData.volume_ml, drinkData.alcohol_percent);
  userDrinksMap[drinkData.user_id].push(drinkData);
  
  renderLeaderboard();
}

function renderLeaderboard() {
  const container = document.getElementById('live-stats');
  container.innerHTML = '';

  // User nach Gesamtscore sortieren
  const sortedUserIds = Object.keys(userDataMap).sort((a, b) => userDataMap[b].score - userDataMap[a].score);

  sortedUserIds.forEach((userId) => {
    const user = userDataMap[userId];
    const drinks = userDrinksMap[userId];
    
    if (user.score === 0 || drinks.length === 0) return;

    // Container für die ganze Spalte dieses Spielers
    const col = document.createElement('div');
    col.className = 'player-column';

    // Zeigt den Gesamt-Score oben drüber an (gerundet)
    const scoreLabel = document.createElement('div');
    scoreLabel.className = 'player-score';
    scoreLabel.innerText = Math.round(user.score);
    col.appendChild(scoreLabel);

    // Der eigentliche Turm aus Drinks
    const tower = document.createElement('div');
    tower.className = 'player-tower';

    drinks.forEach(drink => {
      const block = document.createElement('div');
      block.className = 'drink-block';
      
      // HÖHE: Menge bestimmt die Höhe (z.B. 500ml * 0.3 = 150px hoch)
      // Wichtig: Maximalhöhe begrenzen, falls jemand "10000ml" eingibt
      let h = Math.min(drink.volume_ml * 0.3, 300);
      // Mindesthöhe, damit auch ein 20ml Shot sichtbar ist
      if (h < 15) h = 15; 
      
      block.style.height = `${h}px`;
      
      // FARBE: Abhängig vom Alkoholgehalt
      block.style.backgroundColor = getColorForAlcohol(drink.alcohol_percent);
      
      // Leichter Glow-Effekt für die Farbe
      block.style.boxShadow = `0 0 10px ${getColorForAlcohol(drink.alcohol_percent)}66`;

      tower.appendChild(block);
    });

    col.appendChild(tower);

    // Name des Spielers ganz unten (unter der Linie)
    const nameLabel = document.createElement('div');
    nameLabel.className = 'player-name';
    nameLabel.innerText = user.name;
    col.appendChild(nameLabel);

    container.appendChild(col);
  });
}

initLeaderboard();
