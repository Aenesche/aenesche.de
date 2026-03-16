// Gleiche Supabase-Konfiguration wie in app.js
const SUPABASE_URL = 'https://usihbregbanpfspblrnw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWhicmVnYmFucGZzcGJscm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDkyNzEsImV4cCI6MjA4NzY4NTI3MX0.U_f2brykxMbegtddye-hpy0lcJgtEzl1AB9lQGpd5UY';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 1. Raum-Code aus der URL auslesen
const urlParams = new URLSearchParams(window.location.search);
const currentRoomCode = urlParams.get('room');

if (!currentRoomCode) {
  alert("Kein Raum-Code gefunden! Leite zurück zur Startseite...");
  window.location.href = 'index.html';
}

// UI aktualisieren
document.getElementById('roomCodeDisplay').innerText = currentRoomCode;

// 2. QR Code generieren
const joinUrl = `https://aenesche.de/drinkmaster/party.html?room=${currentRoomCode}`;
new QRCode(document.getElementById("qrcode"), {
  text: joinUrl,
  width: 200,
  height: 200,
  colorDark : "#000000",
  colorLight : "#ffffff",
  correctLevel : QRCode.CorrectLevel.H
});

// ==========================================
// 3. LIVE LEADERBOARD & REALTIME MAGIE
// ==========================================

let currentRoomId = null;
let userScores = {}; // Speichert die Punkte: { 'uuid-123': { name: 'Peter', score: 25 } }

async function initLeaderboard() {
  // A. Die echte Raum-ID aus der DB holen
  const { data: roomData } = await client
    .from('party_rooms')
    .select('id')
    .eq('room_code', currentRoomCode)
    .single();

  if (!roomData) return;
  currentRoomId = roomData.id;

  // B. Alle bisherigen User und Drinks laden
  await loadInitialData();

  // C. SUPABASE REALTIME: Lauschen auf neue Drinks!
  client
    .channel('party_drinks_channel')
    .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'party_drinks',
        filter: `room_id=eq.${currentRoomId}` // Wir wollen nur Drinks aus DIESEM Raum
      }, 
      (payload) => {
        console.log("NEUER DRINK LIVE EINGETROFFEN!", payload.new);
        handleNewDrink(payload.new);
      }
    )
    .subscribe();
}

async function loadInitialData() {
  // 1. User holen
  const { data: users } = await client.from('party_users').select('id, display_name').eq('room_id', currentRoomId);
  if (users) {
    users.forEach(u => {
      userScores[u.id] = { name: u.display_name, score: 0 };
    });
  }

  // 2. Bisherige Drinks holen und zusammenrechnen
  const { data: drinks } = await client.from('party_drinks').select('*').eq('room_id', currentRoomId);
  if (drinks) {
    drinks.forEach(d => {
      if(userScores[d.user_id]) {
        userScores[d.user_id].score += calculateScore(d.volume_ml, d.alcohol_percent);
      }
    });
  }
  
  renderLeaderboard();
}

// Die Berechnungs-Formel (Reiner Alkohol in Milliliter)
function calculateScore(volume, alcPercent) {
  // z.B. 500ml Bier * (4.9 / 100) = 24.5 Score-Punkte
  return volume * (alcPercent / 100);
}

// Wird automatisch getriggert, wenn jemand auf dem Handy drückt!
async function handleNewDrink(drinkData) {
  // Falls wir den User noch nicht kennen (gerade erst beigetreten)
  if (!userScores[drinkData.user_id]) {
    const { data: userData } = await client.from('party_users').select('display_name').eq('id', drinkData.user_id).single();
    userScores[drinkData.user_id] = { name: userData?.display_name || "Unbekannt", score: 0 };
  }

  // Punkte addieren
  userScores[drinkData.user_id].score += calculateScore(drinkData.volume_ml, drinkData.alcohol_percent);

  // Leaderboard neu zeichnen
  renderLeaderboard();
}

// Die visuellen Blöcke für den Beamer zeichnen
function renderLeaderboard() {
  const container = document.getElementById('live-stats');
  container.innerHTML = ''; // Vorherige Blöcke löschen

  // User nach Score sortieren (Platz 1 zuerst)
  const sortedUsers = Object.values(userScores).sort((a, b) => b.score - a.score);

  if (sortedUsers.length === 0 || sortedUsers.every(u => u.score === 0)) {
    container.innerHTML = '<p style="color: #666; width: 100%; text-align: center;">Warte auf die ersten Drinks...</p>';
    return;
  }

  sortedUsers.forEach((user, index) => {
    if (user.score === 0) return; // User mit 0 Punkten blenden wir aus

    // Wie hoch soll der Block sein? (Simpel: 1 Punkt = 3 Pixel Höhe, maximal 400px)
    let barHeight = Math.min(user.score * 3, 400); 

    // Container für einen Spieler (Name + Balken + Score)
    const userCol = document.createElement('div');
    userCol.style.display = 'flex';
    userCol.style.flexDirection = 'column';
    userCol.style.alignItems = 'center';
    userCol.style.justifyContent = 'flex-end';
    userCol.style.width = '70px';

    // Der leuchtende Block
    const bar = document.createElement('div');
    bar.style.height = `${barHeight}px`;
    bar.style.width = '50px';
    // Platz 1 leuchtet Pink, der Rest Cyan
    bar.style.backgroundColor = index === 0 ? 'var(--neon-pink)' : 'var(--neon-cyan)';
    bar.style.boxShadow = `0 0 15px ${bar.style.backgroundColor}`;
    bar.style.borderRadius = '8px 8px 0 0';
    bar.style.transition = 'height 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)'; // Coole "Wackel"-Animation beim Wachsen

    const scoreLabel = document.createElement('div');
    scoreLabel.innerText = Math.round(user.score);
    scoreLabel.style.color = '#fff';
    scoreLabel.style.fontWeight = 'bold';
    scoreLabel.style.marginBottom = '5px';

    const nameLabel = document.createElement('div');
    nameLabel.innerText = user.name;
    nameLabel.style.marginTop = '10px';
    nameLabel.style.fontWeight = 'bold';
    nameLabel.style.color = '#ccc';
    nameLabel.style.overflow = 'hidden';
    nameLabel.style.textOverflow = 'ellipsis';
    nameLabel.style.maxWidth = '100%';

    userCol.appendChild(scoreLabel);
    userCol.appendChild(bar);
    userCol.appendChild(nameLabel);

    container.appendChild(userCol);
  });
}

// Startschuss!
initLeaderboard();
