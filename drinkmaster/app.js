// Trage hier wieder deine ECHTEN Keys ein!
const SUPABASE_URL = 'https://deine-projekt-id.supabase.co';
const SUPABASE_ANON_KEY = 'dein-anon-key';

// FIX: Wir nennen die Variable jetzt 'client' statt 'supabase', um den Namenskonflikt zu vermeiden!
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createRoom() {
  const adminPassword = prompt("Setze ein Passwort für den Admin-Bereich (Beamer-Ansicht):");
  
  if (!adminPassword) {
    alert("Ohne Passwort kein Admin-Bereich!");
    return;
  }

  const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();

  // FIX: Hier nutzen wir jetzt 'client.from'
  const { data, error } = await client
    .from('party_rooms')
    .insert([
      { room_code: roomCode, admin_password: adminPassword }
    ])
    .select();

  if (error) {
    console.error("Fehler beim Erstellen:", error);
    alert("Konnte den Raum nicht erstellen. Check die Konsole.");
    return;
  }

  const roomData = data[0];

  localStorage.setItem('isAdmin', 'true');
  localStorage.setItem('adminRoomId', roomData.id);
  localStorage.setItem('adminRoomCode', roomCode);

  // Leitet direkt zur Beamer-Ansicht weiter
  window.location.href = `presentation.html?room=${roomCode}`;
}

function toggleJoinForm() {
  const form = document.getElementById('joinForm');
  form.style.display = form.style.display === 'block' ? 'none' : 'block';
}

function joinRoom() {
  const code = document.getElementById('roomCodeInput').value.toUpperCase();
  if (code.length > 0) {
    window.location.href = `party.html?room=${code}`;
  }
}
