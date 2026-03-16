// Gleiche Supabase-Konfiguration wie in app.js
const SUPABASE_URL = 'https://usihbregbanpfspblrnw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWhicmVnYmFucGZzcGJscm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDkyNzEsImV4cCI6MjA4NzY4NTI3MX0.U_f2brykxMbegtddye-hpy0lcJgtEzl1AB9lQGpd5UY';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// 1. Raum-Code aus der URL auslesen (z.B. ?room=XYZ)
const urlParams = new URLSearchParams(window.location.search);
const currentRoomCode = urlParams.get('room');

if (!currentRoomCode) {
  alert("Kein Raum-Code gefunden! Leite zurück zur Startseite...");
  window.location.href = 'index.html';
}

// 2. UI aktualisieren
document.getElementById('roomCodeDisplay').innerText = currentRoomCode;

// 3. QR Code generieren
// Die URL, die aufgerufen wird, wenn man den Code scannt
const joinUrl = `https://aenesche.de/drinkmaster/party.html?room=${currentRoomCode}`;

new QRCode(document.getElementById("qrcode"), {
  text: joinUrl,
  width: 200,
  height: 200,
  colorDark : "#000000",
  colorLight : "#ffffff",
  correctLevel : QRCode.CorrectLevel.H
});

// 4. (Später) Hier kommt die Supabase Realtime Logik hin,
// um auf neue Drinks zu hören und das Leaderboard zu aktualisieren.
console.log("Beamer-Ansicht bereit für Raum:", currentRoomCode);
