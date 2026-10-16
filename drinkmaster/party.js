const SUPABASE_URL = 'https://usihbregbanpfspblrnw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWhicmVnYmFucGZzcGJscm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDkyNzEsImV4cCI6MjA4NzY4NTI3MX0.U_f2brykxMbegtddye-hpy0lcJgtEzl1AB9lQGpd5UY';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const roomCode = (urlParams.get('room') || '').trim().toUpperCase();

let currentRoomId = null;
let currentUserId = null;

let totalPureAlcohol = 0;
let currentBucket = 0;
let completedBuckets = [];
let userReactions = []; // Speichert alle gespielten Runden für das Diagramm
let myChartInstance = null; // Unsere Graphen-Instanz

const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const statsSection = document.getElementById('stats-section');
const volSlider = document.getElementById('volumeSlider');
const alcSlider = document.getElementById('alcSlider');

let personalChannel = null;
let isJoining = false;

async function init() {
  if (!roomCode) { alert("Kein Raum angegeben!"); return; }
  document.getElementById('room-display').innerText = roomCode;
  document.getElementById('link-to-presentation').href = `presentation.html?room=${encodeURIComponent(roomCode)}`;

  const { data: roomData, error: roomError } = await client.from('party_rooms').select('id').eq('room_code', roomCode).maybeSingle();
  if (roomError || !roomData) { alert("Raum nicht gefunden!"); return; }
  currentRoomId = roomData.id;

  const savedToken = localStorage.getItem(`token_${roomCode}`);
  if (savedToken) {
    // Token muss zu DIESEM Raum gehören
    const { data: userData } = await client.from('party_users').select('id, display_name').eq('local_token', savedToken).eq('room_id', currentRoomId).maybeSingle();
    if (userData) {
      await startSession(userData.id, userData.display_name, savedToken);
      return;
    }
    localStorage.removeItem(`token_${roomCode}`); // veralteter Token
  }
  loginSection.classList.remove('hidden');
}

// Gemeinsamer Einstieg nach Login/Registrierung/Wiederkehr
async function startSession(userId, name, token) {
  currentUserId = userId;
  localStorage.setItem(`token_${roomCode}`, token);
  document.getElementById('display-name').innerText = name;
  await loadUserStats();

  // Handy lauscht auf Änderungen an den EIGENEN Daten (z.B. Admin löscht einen Drink)
  if (personalChannel) client.removeChannel(personalChannel);
  personalChannel = client.channel(`user_${currentUserId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'party_drinks', filter: `user_id=eq.${currentUserId}` }, () => { loadUserStats(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'party_reactions', filter: `user_id=eq.${currentUserId}` }, () => { loadUserStats(); })
    .subscribe();

  showDashboard();
}

async function joinParty() {
  if (isJoining || !currentRoomId) return;
  const username = document.getElementById('usernameInput').value.trim().replace(/\s+/g, ' ');
  const password = document.getElementById('passwordInput').value.trim();

  if (username.length < 2) { alert("Bitte gib einen Namen ein (min. 2 Zeichen)."); return; }
  if (username.length > 24) { alert("Name ist zu lang (max. 24 Zeichen)."); return; }

  const joinBtn = document.getElementById('joinBtn');
  isJoining = true;
  joinBtn.disabled = true;
  joinBtn.innerText = '...';

  try {
    // Gleicher Name in anderer Schreibweise ("max" vs "Max") zählt auch als vergeben
    const { data: roomUsers, error: listError } = await client.from('party_users').select('id, display_name, password_hash, local_token').eq('room_id', currentRoomId);
    if (listError) { alert("Verbindungsfehler. Versuch's nochmal."); return; }
    const existingUser = (roomUsers || []).find(u => u.display_name.toLowerCase() === username.toLowerCase());

    if (existingUser) {
      if (existingUser.password_hash) {
        if (existingUser.password_hash !== password) {
          alert(`„${existingUser.display_name}" ist schon vergeben und mit Passwort geschützt.\n\nFalsches Passwort – oder wähl einen anderen Namen.`);
          return;
        }
      } else {
        // FIX: Früher wurde man hier still in den fremden Account eingeloggt
        const isMe = confirm(`„${existingUser.display_name}" ist schon vergeben!\n\nOK = Das bin ICH (z.B. neues Handy/Browser)\nAbbrechen = Ich wähle einen anderen Namen`);
        if (!isMe) {
          document.getElementById('usernameInput').focus();
          return;
        }
      }
      await startSession(existingUser.id, existingUser.display_name, existingUser.local_token);
      return;
    }

    const localToken = crypto.randomUUID();
    const { data, error } = await client.from('party_users').insert([{ room_id: currentRoomId, display_name: username, local_token: localToken, password_hash: password || null }]).select('id, display_name').single();

    if (error) {
      if (error.code === '23505') {
        // Zwei Leute haben exakt gleichzeitig denselben Namen gewählt
        alert(`„${username}" wurde gerade von jemand anderem genommen. Wähl bitte einen anderen Namen.`);
      } else {
        alert("Fehler beim Beitreten.");
      }
      return;
    }

    await startSession(data.id, data.display_name, localToken);
  } finally {
    isJoining = false;
    joinBtn.disabled = false;
    joinBtn.innerText = "Let's Go";
  }
}

function logoutUser() {
  if (!confirm("Abmelden? Deine Drinks bleiben gespeichert – du kannst dich mit deinem Namen wieder einloggen.")) return;
  localStorage.removeItem(`token_${roomCode}`);
  if (personalChannel) { client.removeChannel(personalChannel); personalChannel = null; }
  currentUserId = null;
  totalPureAlcohol = 0;
  currentBucket = 0;
  completedBuckets = [];
  userReactions = [];
  closeReactionTest();
  dashboardSection.classList.add('hidden');
  statsSection.classList.add('hidden');
  document.getElementById('usernameInput').value = '';
  document.getElementById('passwordInput').value = '';
  loginSection.classList.remove('hidden');
}

async function loadUserStats() {
  const { data: drinks } = await client.from('party_drinks').select('volume_ml, alcohol_percent').eq('user_id', currentUserId);
  totalPureAlcohol = 0;
  if (drinks) {
    drinks.forEach(d => { totalPureAlcohol += d.volume_ml * (d.alcohol_percent / 100); });
  }
  currentBucket = Math.floor(totalPureAlcohol / 10);

  // Reaktionen für das Diagramm laden
  const { data: reactions } = await client.from('party_reactions').select('*').eq('user_id', currentUserId).order('pure_alcohol_ml', { ascending: true });
  
  userReactions = reactions || [];
  completedBuckets = userReactions.map(r => r.alcohol_bucket);

  updateReactionButton();
}

function updateReactionButton() {
  const btn = document.getElementById('btn-reaction-test');
  if (!btn) return;

  if (completedBuckets.includes(currentBucket)) {
    btn.disabled = true;
    btn.style.borderColor = '#555';
    btn.style.color = '#888';
    const nextTarget = (currentBucket + 1) * 10;
    btn.innerText = `🔒 Gespielt! (Next: ${nextTarget}ml)`;
  } else {
    btn.disabled = false;
    btn.style.borderColor = '#f6e05e';
    btn.style.color = '#f6e05e';
    btn.innerText = `🎮 Spielen! (Stufe ${currentBucket})`;
  }
}

// ==========================================
// UI & STATS GRAPH
// ==========================================
function showDashboard() {
  loginSection.classList.add('hidden');
  statsSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
}

function showPersonalStats() {
  dashboardSection.classList.add('hidden');
  statsSection.classList.remove('hidden');
  renderChart();
  renderPersonalStatsUI(); // NEU
}

function renderPersonalStatsUI() {
  const pbEl = document.getElementById('pb-time');
  const pwEl = document.getElementById('pw-time');
  const historyEl = document.getElementById('history-list');

  if (userReactions.length === 0) {
    pbEl.innerText = '-- ms';
    pwEl.innerText = '-- ms';
    historyEl.innerHTML = '<p style="color: #666; text-align: center;">Noch keine Tests gespielt.</p>';
    return;
  }

  // PB und PW berechnen
  let minTime = Math.min(...userReactions.map(r => r.reaction_time_ms));
  let maxTime = Math.max(...userReactions.map(r => r.reaction_time_ms));

  pbEl.innerText = minTime + ' ms';
  pwEl.innerText = maxTime + ' ms';

  // Liste füllen (Neueste zuerst)
  historyEl.innerHTML = '';
  [...userReactions].reverse().forEach(r => {
    const div = document.createElement('div');
    div.style.borderBottom = '1px solid #333';
    div.style.padding = '8px 0';
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.innerHTML = `
      <span style="color: #ccc;">Stufe ${r.alcohol_bucket} <span style="font-size: 0.8rem; color: #666;">(${Math.round(r.pure_alcohol_ml)}ml)</span></span>
      <strong style="color: var(--neon-cyan);">${r.reaction_time_ms} ms</strong>
    `;
    historyEl.appendChild(div);
  });
}

function hidePersonalStats() {
  statsSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
}

function renderChart() {
  const ctx = document.getElementById('myChart').getContext('2d');
  
  // Formatieren der Daten für Chart.js
  const dataPoints = userReactions.map(r => ({
    x: r.pure_alcohol_ml,
    y: r.reaction_time_ms
  }));

  if (myChartInstance) {
    myChartInstance.destroy(); // Alten Graphen löschen, falls existent
  }

  myChartInstance = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Reaktionszeit',
        data: dataPoints,
        borderColor: '#00f3ff', // Cyan Linie
        backgroundColor: '#ff00ea', // Pinke Punkte
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 9,
        showLine: true, // Verbindet die Punkte zu einer Kurve!
        tension: 0.3 // Macht die Kurve leicht geschwungen
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Getrunkener Reinalkohol (ml)', color: '#ccc', font: {size: 14} },
          grid: { color: '#333' },
          ticks: { color: '#888' }
        },
        y: {
          title: { display: true, text: 'Reaktionszeit (ms)', color: '#ccc', font: {size: 14} },
          grid: { color: '#333' },
          ticks: { color: '#888' },
          beginAtZero: false
        }
      },
      plugins: {
        legend: { display: false } // Versteckt die unnötige Legende
      }
    }
  });
}

// ==========================================
// SLIDER & DRINKS
// ==========================================
function updateSliders() {
  document.getElementById('vol-val').innerText = volSlider.value;
  document.getElementById('alc-val').innerText = alcSlider.value;
}

function setPreset(vol, alc) {
  volSlider.value = vol;
  alcSlider.value = alc;
  updateSliders();
}

async function submitDrink() {
  const btn = document.getElementById('submitBtn');
  if (btn.disabled) return;

  const vol = parseInt(volSlider.value);
  const alc = parseFloat(alcSlider.value);

  btn.disabled = true;
  btn.innerText = "WIRD GESENDET...";

  const { error } = await client.from('party_drinks').insert([{ user_id: currentUserId, room_id: currentRoomId, volume_ml: vol, alcohol_percent: alc }]);

  if (error) {
    alert("Fehler beim Eintragen!");
    btn.disabled = false;
    btn.innerText = "DRINK EINTRAGEN";
  } else {
    await loadUserStats();

    let timeLeft = 10;
    btn.innerText = `PROST! 🍻 (${timeLeft}s)`;

    const cooldownTimer = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft > 0) {
        btn.innerText = `PROST! 🍻 (${timeLeft}s)`;
      } else {
        clearInterval(cooldownTimer);
        btn.disabled = false;
        btn.innerText = "DRINK EINTRAGEN";
      }
    }, 1000); 
  }
}

// ==========================================
// GAME LOGIK
// ==========================================
let reactionTimer = null;
let reactionStartTime = 0;
let isGreen = false;
let isWaiting = false;

function startReactionTest() {
  document.getElementById('reaction-overlay').classList.remove('hidden');
  document.getElementById('reaction-title').innerText = 'Fokus...';
  document.getElementById('reaction-pad').classList.add('hidden');
  document.getElementById('reaction-anim').classList.add('hidden');
  document.getElementById('btn-start-reaction').classList.remove('hidden');
  isGreen = false;
  isWaiting = false;
  clearTimeout(reactionTimer);
}

function beginReactionTimer() {
  document.getElementById('btn-start-reaction').classList.add('hidden');
  document.getElementById('reaction-pad').classList.remove('hidden');
  document.getElementById('reaction-anim').classList.remove('hidden'); 
  resetReactionPad();
}

function closeReactionTest() {
  document.getElementById('reaction-overlay').classList.add('hidden');
  clearTimeout(reactionTimer);
}

let isFailed = false; // NEUE VARIABLE

function resetReactionPad() {
  isGreen = false;
  isWaiting = true;
  isFailed = false; // Reset Fail-State
  const pad = document.getElementById('reaction-pad');
  const title = document.getElementById('reaction-title');
  const anim = document.getElementById('reaction-anim');
  
  pad.style.background = '#e53e3e'; 
  pad.style.boxShadow = '0 0 30px #e53e3e80';
  pad.innerText = 'ACHTUNG';
  title.innerText = 'Warte auf GRÜN...';
  anim.classList.remove('hidden'); 

  clearTimeout(reactionTimer);
  
  const randomDelay = Math.floor(Math.random() * 7000) + 3000; 
  
  reactionTimer = setTimeout(() => {
    isGreen = true;
    isWaiting = false;
    anim.classList.add('hidden'); 
    
    pad.style.background = '#48bb78'; 
    pad.style.boxShadow = '0 0 30px #48bb7880';
    pad.innerText = 'JETZT DRÜCKEN!';
    reactionStartTime = Date.now();

    // NEU: AUTO-FAIL NACH 3 SEKUNDEN
    reactionTimer = setTimeout(() => {
      if (isGreen) {
        isGreen = false;
        isFailed = true; // Markiert das Spiel als fehlgeschlagen
        pad.style.background = '#e53e3e';
        pad.style.boxShadow = '0 0 30px #e53e3e80';
        pad.innerText = 'FAIL';
        title.innerHTML = 'Mad cuz bad! 🐌<br><span style="font-size: 1rem; color: #888;">(Zu langsam. Tippe für Neustart)</span>';
      }
    }, 3000);

  }, randomDelay);
}

let isSaving = false;

// FIX: Früher hingen ZWEI Click-Handler am Pad (alter + neuer Code), jetzt nur noch einer
document.getElementById('reaction-pad').addEventListener('click', async () => {
  // Nach Auto-Fail startet ein Klick das Spiel einfach neu
  if (isFailed) {
    resetReactionPad();
    return;
  }

  if (isSaving || (!isWaiting && !isGreen)) return;

  const pad = document.getElementById('reaction-pad');
  const title = document.getElementById('reaction-title');

  if (!isGreen) {
    resetReactionPad();
    title.innerText = 'Zu früh! Warte auf GRÜN...';
    return;
  }

  // Erfolgreich gedrückt!
  const rawReactionTime = Date.now() - reactionStartTime;
  clearTimeout(reactionTimer); // Stoppt den 3-Sekunden Fail-Timer
  isGreen = false;
  isSaving = true;

  pad.style.background = '#3182ce';
  pad.style.boxShadow = '0 0 30px #3182ce80';
  pad.innerText = 'GESPEICHERT';

  // Cap bei 3000ms und Sprüche
  const finalTime = Math.min(rawReactionTime, 3000);
  if (rawReactionTime > 1000) {
    title.innerText = `${finalTime} ms. Ein bisschen lahm, oder? 🐢`;
  } else {
    title.innerText = `${finalTime} Millisekunden! ⚡`;
  }

  const { error } = await client.from('party_reactions').insert([{
    user_id: currentUserId,
    room_id: currentRoomId,
    alcohol_bucket: currentBucket,
    pure_alcohol_ml: totalPureAlcohol,
    reaction_time_ms: finalTime
  }]);

  if (error) {
    pad.innerText = 'FEHLER';
    title.innerText = error.code === '23505'
      ? 'Diese Stufe hast du schon gespielt.'
      : 'Konnte nicht gespeichert werden 😕';
  }

  setTimeout(() => {
    isSaving = false;
    closeReactionTest();
    loadUserStats();
  }, 2500);
});

init();
