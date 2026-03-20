const SUPABASE_URL = 'https://usihbregbanpfspblrnw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWhicmVnYmFucGZzcGJscm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDkyNzEsImV4cCI6MjA4NzY4NTI3MX0.U_f2brykxMbegtddye-hpy0lcJgtEzl1AB9lQGpd5UY';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room');

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

async function init() {
  if (!roomCode) { alert("Kein Raum angegeben!"); return; }
  document.getElementById('room-display').innerText = roomCode;
  document.getElementById('link-to-presentation').href = `presentation.html?room=${roomCode}`;

  const { data: roomData, error: roomError } = await client.from('party_rooms').select('id').eq('room_code', roomCode).single();
  if (roomError || !roomData) { alert("Raum nicht gefunden!"); return; }
  currentRoomId = roomData.id;

  const savedToken = localStorage.getItem(`token_${roomCode}`);
  if (savedToken) {
    const { data: userData } = await client.from('party_users').select('id, display_name').eq('local_token', savedToken).maybeSingle();
    if (userData) {
      currentUserId = userData.id;
      document.getElementById('display-name').innerText = userData.display_name;
      await loadUserStats();
      showDashboard();
      return;
    }
  }
  loginSection.classList.remove('hidden');
}

async function joinParty() {
  const username = document.getElementById('usernameInput').value.trim();
  const password = document.getElementById('passwordInput').value.trim(); 

  if (username.length < 2) { alert("Bitte gib einen Namen ein (min. 2 Zeichen)."); return; }

  const { data: existingUser } = await client.from('party_users').select('id, password_hash, local_token').eq('room_id', currentRoomId).eq('display_name', username).maybeSingle();

  if (existingUser) {
    if (existingUser.password_hash && existingUser.password_hash !== password) {
      alert("Dieser Name ist durch ein Passwort geschützt!");
      return;
    } else if (!existingUser.password_hash && password !== "") {
      alert("Dieser Name hat kein Passwort. Lass das Feld frei.");
      return;
    }
    localStorage.setItem(`token_${roomCode}`, existingUser.local_token);
    currentUserId = existingUser.id;
    document.getElementById('display-name').innerText = username;
    await loadUserStats();
    showDashboard();
    return;
  }

  const localToken = crypto.randomUUID();
  const { data, error } = await client.from('party_users').insert([{ room_id: currentRoomId, display_name: username, local_token: localToken, password_hash: password || null }]).select().single();

  if (error) { alert("Fehler beim Beitreten."); return; }

  localStorage.setItem(`token_${roomCode}`, localToken);
  currentUserId = data.id;
  document.getElementById('display-name').innerText = username;
  await loadUserStats();
  showDashboard();
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

function resetReactionPad() {
  isGreen = false;
  isWaiting = true;
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
  }, randomDelay);
}

document.getElementById('reaction-pad').addEventListener('click', async () => {
  if (!isWaiting && !isGreen) return; 

  const pad = document.getElementById('reaction-pad');
  const title = document.getElementById('reaction-title');

  if (!isGreen) {
    title.innerText = 'Zu früh! Noch ein Versuch...';
    resetReactionPad();
    return;
  }

  const reactionTime = Date.now() - reactionStartTime;
  clearTimeout(reactionTimer);
  isGreen = false;
  
  pad.style.background = '#3182ce'; 
  pad.style.boxShadow = '0 0 30px #3182ce80';
  pad.innerText = 'GESPEICHERT';
  title.innerText = `${reactionTime} Millisekunden!`;

  await client.from('party_reactions').insert([{
    user_id: currentUserId,
    room_id: currentRoomId,
    alcohol_bucket: currentBucket,
    pure_alcohol_ml: totalPureAlcohol,
    reaction_time_ms: reactionTime
  }]);

  setTimeout(() => {
    closeReactionTest();
    loadUserStats();
  }, 2500);
});

init();
