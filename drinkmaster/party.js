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
// 2. Neuer User tritt bei ODER loggt sich in bestehenden Namen ein
async function joinParty() {
  const username = document.getElementById('usernameInput').value.trim();
  const password = document.getElementById('passwordInput').value.trim(); // Neues Feld auslesen

  if (username.length < 2) {
    alert("Bitte gib einen Namen ein (min. 2 Zeichen).");
    return;
  }

  // 1. Prüfen, ob der Name in diesem Raum schon existiert
  const { data: existingUser } = await client
    .from('party_users')
    .select('id, password_hash, local_token')
    .eq('room_id', currentRoomId)
    .eq('display_name', username)
    .single();

  if (existingUser) {
    // NAME EXISTIERT BEREITS! Passwort prüfen.
    // (Achtung: password_hash ist hier einfach das Klartext-Passwort fürs Party-Game)
    if (existingUser.password_hash && existingUser.password_hash !== password) {
      alert("Dieser Name ist geschützt. Falsches Passwort!");
      return;
    } else if (!existingUser.password_hash && password !== "") {
      alert("Dieser Name hat kein Passwort. Lass das Feld leer, um dich einzuloggen.");
      return;
    }

    // Login erfolgreich (Passwort stimmt oder war leer)
    localStorage.setItem(`token_${roomCode}`, existingUser.local_token);
    currentUserId = existingUser.id;
    document.getElementById('display-name').innerText = username;
    showDashboard();
    return;
  }

  // 2. NAME IST NEU -> Neuen User anlegen
  const localToken = crypto.randomUUID();
  const { data, error } = await client
    .from('party_users')
    .insert([{ 
      room_id: currentRoomId, 
      display_name: username,
      local_token: localToken,
      password_hash: password || null // Speichert das Passwort, falls eines angegeben wurde
    }])
    .select()
    .single();

  if (error) {
    alert("Fehler beim Beitreten.");
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
// 4. Drink in die Datenbank feuern (mit 10 Sekunden Cooldown)
async function submitDrink() {
  const btn = document.querySelector('.btn-submit');
  
  // Sicherheits-Check: Wenn der Button schon gesperrt ist, tu gar nichts
  if (btn.disabled) return;

  const vol = parseInt(volSlider.value);
  const alc = parseFloat(alcSlider.value);

  // Button sofort sperren und visuell anpassen
  btn.disabled = true;
  btn.style.opacity = "0.5";
  btn.style.cursor = "not-allowed";
  btn.innerText = "WIRD GESENDET...";

  // Ab zu Supabase!
  const { error } = await client
    .from('party_drinks')
    .insert([{
      user_id: currentUserId,
      room_id: currentRoomId,
      volume_ml: vol,
      alcohol_percent: alc
    }]);

  if (error) {
    console.error(error);
    alert("Fehler beim Eintragen!");
    // Bei Fehler sofort wieder freigeben
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
    btn.innerText = "DRINK EINTRAGEN";
  } else {
    // ERFOLG! Jetzt startet der 10-Sekunden-Timer
    let timeLeft = 10;
    btn.innerText = `PROST! 🍻 (${timeLeft}s)`;

    const cooldownTimer = setInterval(() => {
      timeLeft -= 1;
      
      if (timeLeft > 0) {
        btn.innerText = `PROST! 🍻 (${timeLeft}s)`;
      } else {
        // Zeit abgelaufen: Timer stoppen und Button wieder normal machen
        clearInterval(cooldownTimer);
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
        btn.innerText = "DRINK EINTRAGEN";
      }
    }, 1000); // 1000 Millisekunden = 1 Sekunde
  }
}
