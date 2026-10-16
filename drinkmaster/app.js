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

  // FIX: Immer genau 5 Zeichen, ohne verwechselbare Zeichen (0/O, 1/I),
  // und bei (seltener) Kollision mit bestehendem Code einfach neu würfeln
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let roomCode = null;
  let roomData = null;

  for (let attempt = 0; attempt < 5 && !roomData; attempt++) {
    const rnd = crypto.getRandomValues(new Uint32Array(5));
    roomCode = Array.from(rnd, n => ALPHABET[n % ALPHABET.length]).join('');

    const { data, error } = await client
      .from('party_rooms')
      .insert([{ room_code: roomCode, admin_password: adminPassword }])
      .select('id')
      .single();

    if (!error) { roomData = data; break; }
    if (error.code !== '23505') {
      console.error("Fehler beim Erstellen:", error);
      alert("Konnte den Raum nicht erstellen. Check die Konsole.");
      return;
    }
  }

  if (!roomData) { alert("Konnte keinen freien Raum-Code finden. Nochmal versuchen!"); return; }

  localStorage.setItem('isAdmin', 'true');
  localStorage.setItem('adminRoomId', roomData.id);
  localStorage.setItem('adminRoomCode', roomCode);

  // FIX: 1. Zuerst öffnen wir den Admin-Tab (nutzt jetzt die richtige Variable 'roomCode')
  window.open(`admin.html?room=${roomCode}`, '_blank');
  
  // FIX: 2. Danach leiten wir das aktuelle Fenster um
  window.location.href = `presentation.html?room=${roomCode}`;
}

function toggleJoinForm() {
  const form = document.getElementById('joinForm');
  form.style.display = form.style.display === 'block' ? 'none' : 'block';
  if (form.style.display === 'block') document.getElementById('roomCodeInput').focus();
}

function joinRoom() {
  const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  if (code.length > 0) {
    window.location.href = `party.html?room=${encodeURIComponent(code)}`;
  }
}
