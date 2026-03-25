// Trage hier wieder deine ECHTEN Keys ein!
const SUPABASE_URL = 'https://usihbregbanpfspblrnw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWhicmVnYmFucGZzcGJscm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDkyNzEsImV4cCI6MjA4NzY4NTI3MX0.U_f2brykxMbegtddye-hpy0lcJgtEzl1AB9lQGpd5UY';

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
  window.open(`admin.html?room=${neuerRaumCode}`, '_blank');
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
