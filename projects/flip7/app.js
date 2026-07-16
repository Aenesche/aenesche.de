/* Flip 7 Punktezähler · Supabase REST (Projekt aenesche.de) */

const SUPABASE_URL = "https://usihbregbanpfspblrnw.supabase.co";
const SUPABASE_KEY = "sb_publishable_EFpYk4bXf7pd1mhM9FbiHg_WKkAlq7n";
const ROOM_STORAGE_KEY = "flip7_room";

// ---------- Supabase REST Helper ----------
async function sb(path, { method = "GET", body = null } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

// ---------- State ----------
const state = {
  room: null,          // {id, name, code}
  allPlayers: [],      // [{id, name}] aus DB (nur aktueller Raum)
  seats: [],           // [{id, name}] Sitzreihenfolge fürs neue Spiel
  game: null,          // {id, target_score, player_ids}
  gamePlayers: [],     // Reihenfolge im laufenden Spiel
  entries: [],         // [{id, player_id, round, points}] chronologisch
};

const $ = (id) => document.getElementById(id);
const roomFilter = () => `room_id=eq.${state.room.id}`;

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add("hidden"), 3500);
}

// ---------- Navigation ----------
function showView(name) {
  if (!state.room && name !== "room") name = "room";
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  $(`view-${name}`).classList.add("active");
  const tab = document.querySelector(`.tab[data-view="${name}"]`);
  if (tab) tab.classList.add("active");
  if (name === "board") renderBoard();
}
document.querySelectorAll(".tab").forEach((t) =>
  t.addEventListener("click", () => showView(t.dataset.view))
);

// ---------- Raum-System ----------
function saveRoom(room) {
  localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(room));
}

function renderRoombar() {
  const bar = $("roombar");
  const tabs = document.querySelector(".tabs");
  if (state.room) {
    $("roomName").textContent = state.room.name;
    $("roomCode").textContent = state.room.code;
    bar.classList.remove("hidden");
    tabs.classList.remove("hidden");
  } else {
    bar.classList.add("hidden");
    tabs.classList.add("hidden");
  }
}

async function enterRoom(room) {
  state.room = room;
  saveRoom(room);
  renderRoombar();
  try {
    await loadPlayers();
    await checkOpenGame();
  } catch (e) {
    toast("Daten konnten nicht geladen werden.");
    console.error(e);
  }
  showView("setup");
}

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne I/O/0/1
  let c = "";
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

$("btnCreateRoom").addEventListener("click", async () => {
  const name = $("newRoomName").value.trim();
  if (!name) return toast("Bitte einen Raumnamen eingeben.");
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [room] = await sb("flip7_rooms", {
        method: "POST",
        body: { name, code: makeCode() },
      });
      $("newRoomName").value = "";
      toast(`Raum erstellt – Code: ${room.code}`);
      return enterRoom(room);
    } catch (e) {
      if (!String(e).includes("409") && !String(e).includes("duplicate")) {
        toast("Raum konnte nicht erstellt werden.");
        return console.error(e);
      }
      // Code-Kollision -> neuer Versuch
    }
  }
  toast("Raum konnte nicht erstellt werden – bitte nochmal.");
});

$("btnJoin").addEventListener("click", async () => {
  const code = $("joinCode").value.trim().toUpperCase();
  if (code.length !== 6) return toast("Der Code hat 6 Zeichen.");
  try {
    const rooms = await sb(`flip7_rooms?select=id,name,code&code=eq.${code}`);
    if (!rooms.length) return toast("Kein Raum mit diesem Code gefunden.");
    $("joinCode").value = "";
    enterRoom(rooms[0]);
  } catch (e) {
    toast("Beitreten fehlgeschlagen.");
    console.error(e);
  }
});
$("joinCode").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("btnJoin").click();
});

$("btnLeaveRoom").addEventListener("click", () => {
  if (state.game && !confirm("Es läuft noch ein Spiel. Raum trotzdem verlassen?")) return;
  localStorage.removeItem(ROOM_STORAGE_KEY);
  state.room = null;
  state.allPlayers = [];
  state.seats = [];
  state.game = null;
  state.entries = [];
  $("tabGame").disabled = true;
  $("resumeBanner").classList.add("hidden");
  renderSeats();
  renderRoombar();
  showView("room");
});

// ---------- Spieler laden / anlegen ----------
async function loadPlayers() {
  state.allPlayers = await sb(`flip7_players?select=id,name&${roomFilter()}&order=name.asc`);
  const sel = $("playerSelect");
  sel.innerHTML = '<option value="">– Spieler wählen –</option>';
  for (const p of state.allPlayers) {
    const o = document.createElement("option");
    o.value = p.id;
    o.textContent = p.name;
    sel.appendChild(o);
  }
}

function renderSeats() {
  const list = $("seatList");
  list.innerHTML = "";
  state.seats.forEach((p, i) => {
    const li = document.createElement("li");
    li.dataset.seat = i + 1;
    li.textContent = p.name;
    li.title = "Entfernen";
    li.addEventListener("click", () => {
      state.seats.splice(i, 1);
      renderSeats();
    });
    list.appendChild(li);
  });
  $("btnStart").disabled = state.seats.length < 2;
}

$("btnAddExisting").addEventListener("click", () => {
  const id = $("playerSelect").value;
  if (!id) return;
  const p = state.allPlayers.find((x) => x.id === id);
  if (state.seats.some((s) => s.id === id)) return toast(`${p.name} ist schon dabei.`);
  state.seats.push(p);
  renderSeats();
});

$("btnAddNew").addEventListener("click", async () => {
  const name = $("newPlayerName").value.trim();
  if (!name) return;
  if (state.allPlayers.some((p) => p.name.toLowerCase() === name.toLowerCase()))
    return toast("Diesen Namen gibt es schon – wähle ihn im Dropdown.");
  try {
    const [p] = await sb("flip7_players", {
      method: "POST",
      body: { name, room_id: state.room.id },
    });
    $("newPlayerName").value = "";
    await loadPlayers();
    state.seats.push(p);
    renderSeats();
  } catch (e) {
    toast("Spieler konnte nicht angelegt werden.");
    console.error(e);
  }
});

// ---------- Spiel starten / fortsetzen ----------
$("btnStart").addEventListener("click", async () => {
  const target = Math.max(1, parseInt($("targetScore").value, 10) || 200);
  try {
    const [game] = await sb("flip7_games", {
      method: "POST",
      body: {
        target_score: target,
        player_ids: state.seats.map((p) => p.id),
        room_id: state.room.id,
      },
    });
    state.game = game;
    state.gamePlayers = [...state.seats];
    state.entries = [];
    $("tabGame").disabled = false;
    renderGame();
    showView("game");
  } catch (e) {
    toast("Spiel konnte nicht gestartet werden.");
    console.error(e);
  }
});

async function checkOpenGame() {
  const games = await sb(
    `flip7_games?select=id,target_score,player_ids&${roomFilter()}&finished_at=is.null&order=created_at.desc&limit=1`
  );
  if (games.length) {
    $("resumeBanner").classList.remove("hidden");
    $("btnResume").onclick = () => resumeGame(games[0]);
  } else {
    $("resumeBanner").classList.add("hidden");
  }
}

async function resumeGame(game) {
  try {
    state.game = game;
    state.gamePlayers = game.player_ids.map(
      (id) => state.allPlayers.find((p) => p.id === id) || { id, name: "?" }
    );
    state.entries = await sb(
      `flip7_scores?select=id,player_id,round,points&game_id=eq.${game.id}&order=created_at.asc`
    );
    $("tabGame").disabled = false;
    renderGame();
    showView("game");
  } catch (e) {
    toast("Spiel konnte nicht geladen werden.");
    console.error(e);
  }
}

// ---------- Spiellogik ----------
const currentRound = () =>
  Math.floor(state.entries.length / state.gamePlayers.length) + 1;
const currentTurnIndex = () => state.entries.length % state.gamePlayers.length;
const totalOf = (playerId) =>
  state.entries
    .filter((e) => e.player_id === playerId)
    .reduce((s, e) => s + e.points, 0);

function renderGame() {
  if (!state.game) return;
  const round = currentRound();
  const player = state.gamePlayers[currentTurnIndex()];

  $("roundLabel").textContent = `Runde ${round}`;
  $("targetLabel").textContent = `Ziel: ${state.game.target_score}`;
  $("cornerTL").textContent = `R${round}`;
  $("cornerBR").textContent = `R${round}`;
  $("currentPlayer").textContent = player.name;
  $("currentTotal").textContent = totalOf(player.id);
  $("pointsInput").value = "";
  $("btnUndo").disabled = state.entries.length === 0;

  // Runden-Fortschritt: Punkte in Sitzreihenfolge
  const turnIdx = currentTurnIndex();
  const dots = $("roundDots");
  dots.innerHTML = "";
  state.gamePlayers.forEach((p, i) => {
    const d = document.createElement("span");
    d.className = "dot" + (i < turnIdx ? " done" : i === turnIdx ? " current" : "");
    d.textContent = p.name.slice(0, 2).toUpperCase();
    d.title = p.name + (i < turnIdx ? " · eingetragen" : i === turnIdx ? " · am Zug" : " · wartet");
    dots.appendChild(d);
  });

  const list = $("totalsList");
  list.innerHTML = "";
  const lastRoundBusts = new Set(
    state.entries.filter((e) => e.round === round - 1 && e.points === 0).map((e) => e.player_id)
  );
  const sorted = [...state.gamePlayers].sort((a, b) => totalOf(b.id) - totalOf(a.id));
  for (const p of sorted) {
    const li = document.createElement("li");
    if (p.id === player.id) li.classList.add("turn");
    if (lastRoundBusts.has(p.id)) li.classList.add("busted-last");
    li.innerHTML = `<span></span><span class="pts"></span>`;
    li.firstChild.textContent = p.name;
    li.lastChild.textContent = totalOf(p.id);
    list.appendChild(li);
  }
}

async function submitPoints(points) {
  const player = state.gamePlayers[currentTurnIndex()];
  const round = currentRound();
  try {
    const [row] = await sb("flip7_scores", {
      method: "POST",
      body: {
        game_id: state.game.id,
        player_id: player.id,
        round,
        points,
        room_id: state.room.id,
      },
    });
    state.entries.push(row);

    const inner = $("playcardInner");
    inner.classList.remove("flip");
    void inner.offsetWidth; // Animation neu triggern
    inner.classList.add("flip");

    // Runde komplett? -> Zielwert prüfen (Flip-7-Regel: Runde wird fertig gespielt)
    if (currentTurnIndex() === 0) {
      const leader = [...state.gamePlayers].sort((a, b) => totalOf(b.id) - totalOf(a.id))[0];
      if (totalOf(leader.id) >= state.game.target_score) return finishGame(leader);
    }
    renderGame();
  } catch (e) {
    toast("Eintrag fehlgeschlagen – nochmal versuchen.");
    console.error(e);
  }
}

$("btnSubmit").addEventListener("click", () => {
  const v = parseInt($("pointsInput").value, 10);
  if (Number.isNaN(v) || v < 0) return toast("Bitte Punkte eingeben (0 = Bust).");
  submitPoints(v);
});
$("pointsInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("btnSubmit").click();
});
$("btnBust").addEventListener("click", () => submitPoints(0));

$("btnUndo").addEventListener("click", async () => {
  const last = state.entries[state.entries.length - 1];
  if (!last) return;
  try {
    await sb(`flip7_scores?id=eq.${last.id}`, { method: "DELETE" });
    state.entries.pop();
    renderGame();
  } catch (e) {
    toast("Löschen fehlgeschlagen.");
    console.error(e);
  }
});

$("btnAbort").addEventListener("click", () => {
  if (!state.game) return;
  const leader = [...state.gamePlayers].sort((a, b) => totalOf(b.id) - totalOf(a.id))[0];
  if (confirm(`Spiel jetzt beenden? ${leader.name} führt mit ${totalOf(leader.id)} Punkten.`))
    finishGame(leader);
});

async function finishGame(winner) {
  try {
    await sb(`flip7_games?id=eq.${state.game.id}`, {
      method: "PATCH",
      body: { finished_at: new Date().toISOString(), winner_id: winner.id },
    });
  } catch (e) {
    console.error(e);
  }
  $("winnerName").textContent = winner.name;
  $("winnerScore").textContent = `${totalOf(winner.id)} Punkte`;
  $("winOverlay").classList.remove("hidden");
  state.game = null;
  state.entries = [];
  $("tabGame").disabled = true;
  $("resumeBanner").classList.add("hidden");
}

$("btnWinOk").addEventListener("click", () => {
  $("winOverlay").classList.add("hidden");
  showView("board");
});

// ---------- Rangliste ----------
let boardMode = "total"; // total | high | avg

document.querySelectorAll("#boardSeg button").forEach((b) =>
  b.addEventListener("click", () => {
    boardMode = b.dataset.mode;
    document.querySelectorAll("#boardSeg button").forEach((x) =>
      x.classList.toggle("active", x === b)
    );
    renderBoard();
  })
);

async function renderBoard() {
  if (!state.room) return;
  const list = $("boardList");
  list.innerHTML = "";
  try {
    const [players, scores, games] = await Promise.all([
      sb(`flip7_players?select=id,name&${roomFilter()}`),
      sb(`flip7_scores?select=player_id,points,game_id&${roomFilter()}`),
      sb(`flip7_games?select=id,winner_id&${roomFilter()}&finished_at=not.is.null`),
    ]);

    const stats = new Map(
      players.map((p) => [
        p.id,
        { name: p.name, points: 0, perGame: new Map(), wins: 0 },
      ])
    );
    for (const s of scores) {
      const st = stats.get(s.player_id);
      if (!st) continue;
      st.points += s.points;
      st.perGame.set(s.game_id, (st.perGame.get(s.game_id) || 0) + s.points);
    }
    for (const g of games) {
      const st = stats.get(g.winner_id);
      if (st) st.wins++;
    }

    const rows = [...stats.values()]
      .filter((s) => s.perGame.size > 0)
      .map((s) => {
        const n = s.perGame.size;
        return {
          ...s,
          games: n,
          high: Math.max(...s.perGame.values()),
          avg: s.points / n,
        };
      });

    const value = (s) =>
      boardMode === "high" ? s.high : boardMode === "avg" ? s.avg : s.points;
    rows.sort((a, b) => value(b) - value(a));

    $("boardEmpty").classList.toggle("hidden", rows.length > 0);

    rows.forEach((s, i) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="rank">${i + 1}</span>
        <span class="name"><span class="meta"></span></span>
        <span class="pts"></span>`;
      const nameEl = li.querySelector(".name");
      nameEl.prepend(s.name);
      li.querySelector(".meta").textContent =
        `${s.games} ${s.games === 1 ? "Spiel" : "Spiele"} · ${s.wins} ${s.wins === 1 ? "Sieg" : "Siege"}`;
      li.querySelector(".pts").textContent =
        boardMode === "avg" ? value(s).toFixed(1).replace(".", ",") : value(s);
      list.appendChild(li);
    });
  } catch (e) {
    toast("Rangliste konnte nicht geladen werden.");
    console.error(e);
  }
}

// ---------- Init ----------
(async function init() {
  const stored = localStorage.getItem(ROOM_STORAGE_KEY);
  if (stored) {
    try {
      const saved = JSON.parse(stored);
      const rooms = await sb(`flip7_rooms?select=id,name,code&id=eq.${saved.id}`);
      if (rooms.length) return enterRoom(rooms[0]);
      localStorage.removeItem(ROOM_STORAGE_KEY);
    } catch (e) {
      console.error(e);
      toast("Verbindung zu Supabase fehlgeschlagen.");
    }
  }
  renderRoombar();
  showView("room");
})();
