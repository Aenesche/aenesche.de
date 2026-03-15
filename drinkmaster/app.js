// Ersetze diese durch deine ECHTEN Supabase Keys aus den Projekteinstellungen
const SUPABASE_URL = 'https://deine-projekt-id.supabase.co';
const SUPABASE_ANON_KEY = 'dein-anon-key';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Funktion 1: Admin erstellt einen neuen Raum
async function createRoom() {
  // 1. Admin nach einem Passwort fragen (simplen Browser-Prompt für den Anfang, 
  // später können wir dafür ein schickes Neon-Modal bauen)
  const adminPassword = prompt("Setze ein Passwort für den Admin-Bereich (Beamer-Ansicht):");
  
  if (!adminPassword) {
    alert("Ohne Passwort kein Admin-Bereich!");
    return;
  }

  // 2. Zufälligen, kurzen Raum-Code generieren (z.B. "X7B9A")
  const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();

  // 3. Raum in Supabase anlegen
  const { data, error } = await supabase
    .from('party_rooms')
    .insert([
      { room_code: roomCode, admin_password: adminPassword }
    ])
    .select(); // .select() ist wichtig, damit Supabase uns die generierte ID zurückgibt

  if (error) {
    console.error("Fehler beim Erstellen:", error);
    alert("Konnte den Raum nicht erstellen. Check die Konsole.");
    return;
  }

  const roomData = data[0];

  // 4. Admin-Rechte lokal im Browser speichern (damit der Admin beim Neuladen Admin bleibt)
  localStorage.setItem('isAdmin', 'true');
  localStorage.setItem('adminRoomId', roomData.id);
  localStorage.setItem('adminRoomCode', roomCode);

  // 5. Weiterleitung zur Beamer-/Admin-Ansicht
  // Wir hängen den Code an die URL an, z.B. admin.html?room=X7B9A
  window.location.href = `admin.html?room=${roomCode}`;
}

// UI-Helfer für das Beitritts-Formular
function toggleJoinForm() {
  const form = document.getElementById('joinForm');
  form.style.display = form.style.display === 'block' ? 'none' : 'block';
}

// Funktion 2: Gast tritt per manuellem Code bei
function joinRoom() {
  const code = document.getElementById('roomCodeInput').value.toUpperCase();
  if (code.length > 0) {
    // Weiterleiten zur mobilen User-Ansicht
    window.location.href = `party.html?room=${code}`;
  }
}
