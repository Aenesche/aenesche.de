const SUPABASE_URL = 'https://usihbregbanpfspblrnw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWhicmVnYmFucGZzcGJscm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDkyNzEsImV4cCI6MjA4NzY4NTI3MX0.U_f2brykxMbegtddye-hpy0lcJgtEzl1AB9lQGpd5UY';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room');

let currentRoomId = null;
let currentUserId = null;

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
    const { data: userData } = await client
      .from('party_users')
      .select('id, display_name')
      .eq('local_token', savedToken)
      .maybeSingle();

    if (userData) {
      currentUserId = userData.id;
      document.getElementById('display-name').innerText = userData.display_name;
      showDashboard();
      return;
    }
  }
  
  loginSection.classList.remove('hidden');
}

// 2. User Logik (Mit sicherem Passwort-Check)
async function joinParty() {
  const username = document.getElementById('usernameInput').value.trim();
  const password = document.getElementById('passwordInput').value.trim(); 

  if (username.length < 2) {
    alert("Bitte gib einen Namen ein (min. 2 Zeichen).");
    return;
  }

  // Prüfen, ob der Name schon existiert (maybeSingle verhindert Absturz bei neuem User!)
  const { data: existingUser, error: checkError } = await client
    .from('party_users')
    .select('id, password_hash, local_token')
    .eq('room_id', currentRoomId)
    .eq('display_name', username)
    .maybeSingle();

  if (existingUser) {
    // Name existiert -> Passwort abgleichen
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
    showDashboard();
    return;
  }

  // Name ist neu -> User in DB eintragen
  const localToken = crypto.randomUUID();
  const { data, error } = await client
    .from('party_users')
    .insert([{ 
      room_id: currentRoomId, 
      display_name: username,
      local_token: localToken,
      password_hash: password || null 
    }])
    .select()
    .single();

  if (error) {
    alert("Fehler beim Beitreten in die Datenbank.");
    return;
  }

  localStorage.setItem(`token_${roomCode}`, localToken);
  currentUserId = data.id;
  document.getElementById('display-name').innerText = username;
  showDashboard();
}

// 3. UI Helpers
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

// 4. Drink Eintragen (Mit 10 Sek Cooldown)
async function submitDrink() {
  const btn = document.getElementById('submitBtn');
  
  if (btn.disabled) return;

  const vol = parseInt(volSlider.value);
  const alc = parseFloat(alcSlider.value);

  // Button sperren
  btn.disabled = true;
  btn.innerText = "WIRD GESENDET...";

  const { error } = await client
    .from('party_drinks')
    .insert([{
      user_id: currentUserId,
      room_id: currentRoomId,
      volume_ml: vol,
      alcohol_percent: alc
    }]);

  if (error) {
    alert("Fehler beim Eintragen!");
    btn.disabled = false;
    btn.innerText = "DRINK EINTRAGEN";
  } else {
    // ERFOLG! Countdown starten
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

// Start!
init();
