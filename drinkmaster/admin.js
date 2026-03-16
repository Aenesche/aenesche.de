// Deine Keys
const SUPABASE_URL = 'https://usihbregbanpfspblrnw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWhicmVnYmFucGZzcGJscm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDkyNzEsImV4cCI6MjA4NzY4NTI3MX0.U_f2brykxMbegtddye-hpy0lcJgtEzl1AB9lQGpd5UY';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UI Elemente
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const drinkListContainer = document.getElementById('drink-list-container');

let adminRoomId = null;

// 1. Prüfen, ob der Admin schon im Browser gespeichert ist (vom Erstellen des Raums)
function checkLocalAdmin() {
  const isLogged = localStorage.getItem('isAdmin');
  const savedRoomId = localStorage.getItem('adminRoomId');
  const savedRoomCode = localStorage.getItem('adminRoomCode');

  if (isLogged === 'true' && savedRoomId) {
    adminRoomId = savedRoomId;
    document.getElementById('admin-room-display').innerText = savedRoomCode;
    showDashboard();
    loadDrinks();
  }
}

// 2. Manueller Login (Falls du es an einem anderen PC öffnest)
async function loginAdmin() {
  const code = document.getElementById('adminRoomInput').value.trim().toUpperCase();
  const pass = document.getElementById('adminPasswordInput').value;

  if (!code || !pass) {
    alert("Bitte Code und Passwort eingeben!");
    return;
  }

  // Raum in der DB suchen und Passwort abgleichen
  const { data, error } = await client
    .from('party_rooms')
    .select('id, admin_password')
    .eq('room_code', code)
    .single();

  if (error || !data) {
    alert("Raum nicht gefunden!");
    return;
  }

  if (data.admin_password !== pass) {
    alert("Falsches Passwort!");
    return;
  }

  // Erfolgreich eingeloggt
  adminRoomId = data.id;
  localStorage.setItem('isAdmin', 'true');
  localStorage.setItem('adminRoomId', data.id);
  localStorage.setItem('adminRoomCode', code);

  document.getElementById('admin-room-display').innerText = code;
  showDashboard();
  loadDrinks();
}

function logoutAdmin() {
  localStorage.removeItem('isAdmin');
  localStorage.removeItem('adminRoomId');
  localStorage.removeItem('adminRoomCode');
  loginSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
}

function showDashboard() {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
}

// 3. Drinks laden
async function loadDrinks() {
  drinkListContainer.innerHTML = '<p style="padding: 20px; color: #666; text-align: center;">Lade Drinks...</p>';

  // Wir holen die Drinks und gleichzeitig den Namen des Users über die Verknüpfung (party_users)
  const { data: drinks, error } = await client
    .from('party_drinks')
    .select(`
      id,
      volume_ml,
      alcohol_percent,
      created_at,
      party_users ( display_name )
    `)
    .eq('room_id', adminRoomId)
    .order('created_at', { ascending: false }); // Neueste oben

  if (error) {
    drinkListContainer.innerHTML = '<p style="padding: 20px; color: red;">Fehler beim Laden.</p>';
    console.error(error);
    return;
  }

  if (drinks.length === 0) {
    drinkListContainer.innerHTML = '<p style="padding: 20px; color: #666; text-align: center;">Noch keine Drinks eingetragen.</p>';
    return;
  }

  // Liste zeichnen
  drinkListContainer.innerHTML = '';
  drinks.forEach(drink => {
    const timeString = new Date(drink.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const userName = drink.party_users ? drink.party_users.display_name : 'Gelöschter User';

    const item = document.createElement('div');
    item.className = 'drink-item';
    
    item.innerHTML = `
      <div class="drink-info">
        <div class="drink-name">${userName}</div>
        <div class="drink-details">${drink.volume_ml} ml • ${drink.alcohol_percent}% Vol. • ${timeString} Uhr</div>
      </div>
      <button class="btn-delete" onclick="deleteDrink('${drink.id}')">LÖSCHEN</button>
    `;

    drinkListContainer.appendChild(item);
  });
}

// 4. Drink löschen
async function deleteDrink(drinkId) {
  if (!confirm("Diesen Drink wirklich löschen?")) return;

  const { error } = await client
    .from('party_drinks')
    .delete()
    .eq('id', drinkId);

  if (error) {
    alert("Fehler beim Löschen!");
    console.error(error);
  } else {
    // Liste neu laden
    loadDrinks();
  }
}

// Beim Start prüfen
checkLocalAdmin();
