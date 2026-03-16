// TRAGE HIER WIEDER DEINE ECHTEN KEYS EIN
const SUPABASE_URL = 'https://usihbregbanpfspblrnw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWhicmVnYmFucGZzcGJscm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDkyNzEsImV4cCI6MjA4NzY4NTI3MX0.U_f2brykxMbegtddye-hpy0lcJgtEzl1AB9lQGpd5UY';

// Hier nutzen wir jetzt 'client'
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// URL Parameter auslesen
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room');

// Globale Variablen
let currentRoomId = null;
let currentUserId = null;

// UI Elemente
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const volSlider = document.getElementById('volumeSlider');
const alcSlider = document.getElementById('alcSlider');

// 1. Initialisierung
async function init() {
  if (!roomCode) {
    alert("Kein Raum angegeben!");
    return;
  }
  document.getElementById('room-display').innerText = roomCode;
  
  document.getElementById('link-to-presentation').href = `presentation.html?room=${roomCode}`;

  // FIX: client.from statt supabase.from
  const { data: roomData, error: roomError } = await client
    .from('party_rooms')
    .select('id')
    .eq('room_code', roomCode)
    .single();

  if (roomError || !roomData) {
    alert("Raum nicht gefunden!");
    return;
  }
  currentRoomId = roomData.id;

  const savedToken = localStorage.getItem(`token_${roomCode}`);
  
  if (savedToken) {
    // FIX: client.from statt supabase.from
    const { data: userData } = await client
      .from('party_users')
      .select('id, display_name')
      .eq('local_token', savedToken)
      .single();

    if (userData) {
      currentUserId = userData.id;
      document.getElementById('display-name').innerText = userData.display_name;
      showDashboard();
      return;
    }
  }
  
  loginSection.classList.remove('hidden');
}

// 2. Neuer User tritt bei
async function joinParty() {
  const username = document.getElementById('usernameInput').value.trim();
  if (username.length < 2) {
    alert("Bitte gib einen Namen ein (min. 2 Zeichen).");
    return;
  }

  const localToken = crypto.randomUUID();

  // FIX: client.from statt supabase.from
  const { data, error } = await client
    .from('party_users')
    .insert([{ 
      room_id: currentRoomId, 
      display_name: username,
      local_token: localToken 
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { 
      alert("Dieser Name ist in diesem Raum schon vergeben! Bitte wähle einen anderen.");
    } else {
      console.error(error);
      alert("Fehler beim Beitreten. Check die Konsole.");
    }
    return;
  }

  localStorage.setItem(`token_${roomCode}`, localToken);
  currentUserId = data.id;
  document.getElementById('display-name').innerText = username;
  showDashboard();
}

// 3. UI Helper
function showDashboard() {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
}

function updateSliders() {
  document.getElementById('vol-val').innerText = volSlider.value;
  document.getElementById('alc-val').innerText = alcSlider.value;
}

function setPreset(vol, alc) {
  volSlider.value = vol;
  alcSlider.value = alc;
  updateSliders();
}

// 4. Drink in die Datenbank feuern
async function submitDrink() {
  const vol = parseInt(volSlider.value);
  const alc = parseFloat(alcSlider.value);

  const btn = document.querySelector('.btn-submit');
  btn.innerText = "WIRD GESENDET...";
  btn.style.opacity = "0.5";

  // FIX: client.from statt supabase.from
  const { error } = await client
    .from('party_drinks')
    .insert([{
      user_id: currentUserId,
      room_id: currentRoomId,
      volume_ml: vol,
      alcohol_percent: alc
    }]);

  btn.style.opacity = "1";
  
  if (error) {
    console.error(error);
    alert("Fehler beim Eintragen!");
    btn.innerText = "DRINK EINTRAGEN";
  } else {
    btn.innerText = "ERFOLGREICH! PROST 🍻";
    setTimeout(() => { btn.innerText = "DRINK EINTRAGEN"; }, 2000);
  }
}

// App starten
init();
