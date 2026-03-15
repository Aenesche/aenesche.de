const SUPABASE_URL = 'https://deine-projekt-id.supabase.co';
const SUPABASE_ANON_KEY = 'dein-anon-key';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  
  // Link zur Präsentation dynamisch setzen
  document.getElementById('link-to-presentation').href = `presentation.html?room=${roomCode}`;

  // Hole die echte Raum-ID aus der Datenbank anhand des Codes
  const { data: roomData, error: roomError } = await supabase
    .from('party_rooms')
    .select('id')
    .eq('room_code', roomCode)
    .single();

  if (roomError || !roomData) {
    alert("Raum nicht gefunden!");
    return;
  }
  currentRoomId = roomData.id;

  // Seamless Login prüfen: Hat der User schon einen Token für diesen Raum?
  const savedToken = localStorage.getItem(`token_${roomCode}`);
  
  if (savedToken) {
    // Prüfen, ob der User in der DB existiert
    const { data: userData } = await supabase
      .from('party_users')
      .select('id, display_name')
      .eq('local_token', savedToken)
      .single();

    if (userData) {
      // User erfolgreich wiedererkannt!
      currentUserId = userData.id;
      document.getElementById('display-name').innerText = userData.display_name;
      showDashboard();
      return;
    }
  }
  
  // Wenn kein Token oder User nicht in DB: Zeige Login
  loginSection.classList.remove('hidden');
}

// 2. Neuer User tritt bei
async function joinParty() {
  const username = document.getElementById('usernameInput').value.trim();
  if (username.length < 2) {
    alert("Bitte gib einen Namen ein (min. 2 Zeichen).");
    return;
  }

  // Generiere einen zufälligen Token für den Browser
  const localToken = crypto.randomUUID();

  const { data, error } = await supabase
    .from('party_users')
    .insert([{ 
      room_id: currentRoomId, 
      display_name: username,
      local_token: localToken 
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Postgres Unique Violation
      alert("Dieser Name ist in diesem Raum schon vergeben! Bitte wähle einen anderen.");
    } else {
      alert("Fehler beim Beitreten.");
    }
    return;
  }

  // Erfolgreich: Token speichern und ins Dashboard wechseln
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

  // Kurzes visuelles Feedback (Button flackert)
  const btn = document.querySelector('.btn-submit');
  btn.innerText = "WIRD GESENDET...";
  btn.style.opacity = "0.5";

  const { error } = await supabase
    .from('party_drinks')
    .insert([{
      user_id: currentUserId,
      room_id: currentRoomId,
      volume_ml: vol,
      alcohol_percent: alc
    }]);

  btn.style.opacity = "1";
  
  if (error) {
    alert("Fehler beim Eintragen!");
    btn.innerText = "DRINK EINTRAGEN";
  } else {
    btn.innerText = "ERFOLGREICH! PROST 🍻";
    setTimeout(() => { btn.innerText = "DRINK EINTRAGEN"; }, 2000);
  }
}

// App starten
init();
