/* ============ SUFFKALENDER — app.js ============ */
(function () {
  'use strict';

  const db = window.sbClient;
  const $ = (id) => document.getElementById(id);

  // ---------- State ----------
  let userId = null;
  let username = null;
  const entries = new Map();            // 'YYYY-MM-DD' -> 0|1|2
  let view = 'month';                   // week | month | year
  let cursor = today();                 // Referenzdatum der Kalenderansicht
  let globalStats = null;

  let groups = [];                      // [{id,name,code,owner_id}]
  let membersByGroup = new Map();       // groupId -> [userId]
  const profiles = new Map();           // userId -> username
  let activeGroup = null;
  let cmpWeek = startOfWeek(today());

  // ---------- Datum-Helpers ----------
  const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const WD_FULL = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
    'August', 'September', 'Oktober', 'November', 'Dezember'];

  function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function key(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromKey(s) { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function startOfWeek(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return addDays(x, -((x.getDay() + 6) % 7)); }
  function wdIndex(d) { return (d.getDay() + 6) % 7; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  // ---------- UI-Basics ----------
  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  const THEMES = ['kneipe', 'hell', 'dunkel'];
  function applyTheme(name) {
    if (!THEMES.includes(name)) name = 'kneipe';
    document.documentElement.dataset.theme = name;
    try { localStorage.setItem('suff_theme', name); } catch (e) { /* egal */ }
    document.querySelectorAll('[data-theme-btn]').forEach((b) => {
      b.classList.toggle('active', b.dataset.themeBtn === name);
    });
  }

  // ---------- Daten ----------
  async function loadEntries() {
    let from = 0;
    const size = 1000;
    for (;;) {
      const { data, error } = await db.from('suff_entries')
        .select('day,level').eq('user_id', userId).range(from, from + size - 1);
      if (error) throw error;
      (data || []).forEach((r) => entries.set(r.day, r.level));
      if (!data || data.length < size) break;
      from += size;
    }
  }

  async function setEntry(k, level) {
    try {
      if (level === null) {
        const { error } = await db.from('suff_entries')
          .delete().eq('user_id', userId).eq('day', k);
        if (error) throw error;
        entries.delete(k);
      } else {
        const { error } = await db.from('suff_entries')
          .upsert({ user_id: userId, day: k, level, updated_at: new Date().toISOString() });
        if (error) throw error;
        entries.set(k, level);
      }
      renderAll();
    } catch (e) {
      console.error(e);
      toast('Speichern fehlgeschlagen');
    }
  }

  async function ensureProfile() {
    const { data } = await db.from('profiles')
      .select('username').eq('id', userId).maybeSingle();
    if (data && data.username) {
      username = data.username;
      renderGreet();
      return;
    }
    $('nameModal').hidden = false;
    $('nameForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const val = $('nameInput').value.trim();
      if (val.length < 2) return;
      const { error } = await db.from('profiles').upsert({ id: userId, username: val });
      if (error) { toast('Konnte Username nicht speichern'); return; }
      username = val;
      profiles.set(userId, val);
      $('nameModal').hidden = true;
      renderGreet();
      renderGroups();
    });
    $('nameInput').focus();
  }

  async function loadGlobal() {
    const { data, error } = await db.rpc('suff_global_stats');
    if (!error) { globalStats = data; renderStats(); }
  }

  // ---------- Render: Heute ----------
  function renderGreet() {
    $('greet').textContent = username ? 'Prost, ' + username : '';
  }

  function renderToday() {
    const t = today();
    $('todayDate').textContent = WD[wdIndex(t)] + ', ' + t.getDate() + '. ' + MONTHS[t.getMonth()];
    const lvl = entries.get(key(t));
    document.querySelectorAll('[data-quick]').forEach((b) => {
      b.classList.toggle('active', lvl !== undefined && Number(b.dataset.quick) === lvl);
    });
  }

  // ---------- Render: Kalender ----------
  function lvlClass(k) {
    const l = entries.get(k);
    return l === undefined ? '' : ' lv' + l;
  }

  function renderCalendar() {
    const el = $('calendar');
    const tKey = key(today());

    if (view === 'week') {
      const ws = startOfWeek(cursor);
      const we = addDays(ws, 6);
      $('calLabel').textContent =
        ws.getDate() + '.' + (ws.getMonth() === we.getMonth() ? '' : ' ' + MONTHS[ws.getMonth()]) +
        ' – ' + we.getDate() + '. ' + MONTHS[we.getMonth()] + ' ' + we.getFullYear();
      let html = '<div class="week-grid">';
      for (let i = 0; i < 7; i++) {
        const d = addDays(ws, i);
        const k = key(d);
        const future = k > tKey;
        html += '<div class="wcell' + lvlClass(k) + (k === tKey ? ' now' : '') +
          (future ? ' future' : '') + '" data-day="' + (future ? '' : k) + '">' +
          '<span class="wd">' + WD[i] + '</span><span class="num">' + d.getDate() + '</span></div>';
      }
      el.innerHTML = html + '</div>';

    } else if (view === 'month') {
      const y = cursor.getFullYear(), m = cursor.getMonth();
      $('calLabel').textContent = MONTHS[m] + ' ' + y;
      const first = new Date(y, m, 1);
      const days = new Date(y, m + 1, 0).getDate();
      const offset = wdIndex(first);
      let html = '<div class="wd-row">' + WD.map((w) => '<span>' + w + '</span>').join('') +
        '</div><div class="month-grid">';
      for (let i = 0; i < offset; i++) html += '<div class="day blank"></div>';
      for (let dd = 1; dd <= days; dd++) {
        const k = key(new Date(y, m, dd));
        const future = k > tKey;
        html += '<div class="day' + lvlClass(k) + (k === tKey ? ' now' : '') +
          (future ? ' future' : '') + '" data-day="' + (future ? '' : k) + '">' + dd + '</div>';
      }
      el.innerHTML = html + '</div>';

    } else {
      const y = cursor.getFullYear();
      $('calLabel').textContent = String(y);
      let html = '<div class="year-grid">';
      for (let m = 0; m < 12; m++) {
        const days = new Date(y, m + 1, 0).getDate();
        const offset = wdIndex(new Date(y, m, 1));
        html += '<div class="mini" data-month="' + m + '"><div class="mname">' +
          MONTHS[m].slice(0, 3) + '</div><div class="mdays">';
        for (let i = 0; i < offset; i++) html += '<span class="d blank"></span>';
        for (let dd = 1; dd <= days; dd++) {
          html += '<span class="d' + lvlClass(key(new Date(y, m, dd))) + '"></span>';
        }
        html += '</div></div>';
      }
      el.innerHTML = html + '</div>';
    }
  }

  // ---------- Render: Statistik ----------
  function computeStats() {
    const t = today();
    let d30 = 0, b30 = 0;
    for (let i = 0; i < 30; i++) {
      const l = entries.get(key(addDays(t, -i))) || 0;
      if (l >= 1) d30++;
      if (l === 2) b30++;
    }
    let streak = 0;
    for (let d = new Date(t); streak < 3650; d = addDays(d, -1)) {
      if ((entries.get(key(d)) || 0) >= 1) break;
      streak++;
    }
    const wdCount = [0, 0, 0, 0, 0, 0, 0];
    let totalDrink = 0, firstKey = null;
    entries.forEach((l, k) => {
      if (l >= 1) { wdCount[wdIndex(fromKey(k))]++; totalDrink++; }
      if (!firstKey || k < firstKey) firstKey = k;
    });
    let topWd = '–';
    if (totalDrink > 0) topWd = WD_FULL[wdCount.indexOf(Math.max(...wdCount))];
    const span = firstKey
      ? Math.max(Math.round((t - fromKey(firstKey)) / 86400000) + 1, 7) : 7;
    const rate = totalDrink / span;
    return { d30, b30, streak, topWd, rate };
  }

  function renderStats() {
    const s = computeStats();
    $('statGrid').innerHTML =
      '<div class="stat"><div class="v">' + s.d30 + '</div><div class="l">Trinktage · letzte 30 Tage</div></div>' +
      '<div class="stat"><div class="v">' + s.b30 + '</div><div class="l">Blackouts · letzte 30 Tage</div></div>' +
      '<div class="stat"><div class="v">' + s.streak + '</div><div class="l">Tage nüchtern am Stück</div></div>' +
      '<div class="stat"><div class="v" style="font-size:1rem;line-height:2">' + s.topWd + '</div><div class="l">Häufigster Trinktag</div></div>';

    const g = $('globalStat');
    if (globalStats && globalStats.user_count >= 2 && globalStats.avg_rate > 0) {
      const diff = Math.round(((s.rate - globalStats.avg_rate) / globalStats.avg_rate) * 100);
      if (Math.abs(diff) < 3) {
        g.innerHTML = 'Du trinkst <em>genau im Durchschnitt</em> aller ' + globalStats.user_count + ' Nutzer.';
      } else {
        g.innerHTML = 'Du trinkst <em>' + Math.abs(diff) + ' % ' +
          (diff > 0 ? 'mehr' : 'weniger') + '</em> als der Durchschnitt aller ' +
          globalStats.user_count + ' Nutzer.';
      }
    } else {
      g.textContent = 'Der globale Vergleich erscheint, sobald genug Nutzer eintragen.';
    }
  }

  function renderAll() { renderToday(); renderCalendar(); renderStats(); }

  // ---------- Gruppen ----------
  async function loadGroups() {
    const { data: gs, error } = await db.from('suff_groups')
      .select('id,name,code,owner_id').order('created_at');
    if (error) { console.error(error); return; }
    groups = gs || [];
    membersByGroup = new Map();
    if (groups.length) {
      const { data: ms } = await db.from('suff_group_members')
        .select('group_id,user_id').in('group_id', groups.map((g) => g.id));
      (ms || []).forEach((m) => {
        if (!membersByGroup.has(m.group_id)) membersByGroup.set(m.group_id, []);
        membersByGroup.get(m.group_id).push(m.user_id);
      });
      const ids = [...new Set((ms || []).map((m) => m.user_id))];
      if (ids.length) {
        const { data: ps } = await db.from('profiles').select('id,username').in('id', ids);
        (ps || []).forEach((p) => profiles.set(p.id, p.username));
      }
    }
    renderGroups();
    if (activeGroup && !groups.some((g) => g.id === activeGroup.id)) closeGroup();
  }

  function nameOf(id) {
    return profiles.get(id) || (id === userId ? (username || 'Du') : 'Anonym');
  }

  function renderGroups() {
    const el = $('groupList');
    if (!groups.length) {
      el.innerHTML = '<div class="empty-note">Noch keine Gruppen. Erstell eine oder tritt mit einem Code bei.</div>';
      return;
    }
    el.innerHTML = groups.map((g) => {
      const n = (membersByGroup.get(g.id) || []).length;
      return '<div class="group-item" data-group="' + g.id + '">' +
        '<span class="gname">' + esc(g.name) + '</span>' +
        '<span class="gmeta mono">' + n + ' ' + (n === 1 ? 'Mitglied' : 'Mitglieder') + '</span></div>';
    }).join('');
  }

  async function openGroup(gid) {
    activeGroup = groups.find((g) => g.id === gid) || null;
    if (!activeGroup) return;
    cmpWeek = startOfWeek(today());
    await renderGroupDetail();
    $('groupDetail').hidden = false;
    $('groupDetail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function closeGroup() {
    activeGroup = null;
    $('groupDetail').hidden = true;
    $('groupDetail').innerHTML = '';
  }

  async function fetchRange(memberIds, from, to) {
    const { data, error } = await db.from('suff_entries')
      .select('user_id,day,level')
      .in('user_id', memberIds)
      .gte('day', key(from)).lte('day', key(to));
    if (error) { console.error(error); return []; }
    return data || [];
  }

  async function renderGroupDetail() {
    const g = activeGroup;
    const memberIds = membersByGroup.get(g.id) || [];
    const tKey = key(today());
    const ws = cmpWeek, we = addDays(ws, 6);
    const t30from = addDays(today(), -29);

    const [weekRows, rows30] = await Promise.all([
      fetchRange(memberIds, ws, we),
      fetchRange(memberIds, t30from, today())
    ]);

    // Wochenvergleich: userId -> (day -> level)
    const wk = new Map();
    weekRows.forEach((r) => {
      if (!wk.has(r.user_id)) wk.set(r.user_id, new Map());
      wk.get(r.user_id).set(r.day, r.level);
    });

    // 30-Tage-Stats
    const cnt = new Map();    // userId -> Trinktage
    const perDay = new Map(); // day -> Anzahl trinkender Mitglieder
    memberIds.forEach((id) => cnt.set(id, 0));
    rows30.forEach((r) => {
      if (r.level >= 1) {
        cnt.set(r.user_id, (cnt.get(r.user_id) || 0) + 1);
        perDay.set(r.day, (perDay.get(r.day) || 0) + 1);
      }
    });
    const ranking = [...cnt.entries()].sort((a, b) => b[1] - a[1]);
    const maxCnt = Math.max(1, ...ranking.map((r) => r[1]));
    const groupDrinkDays = ranking.reduce((a, r) => a + r[1], 0);
    const groupRate = Math.round((groupDrinkDays / (memberIds.length * 30)) * 100);
    let common = 0;
    perDay.forEach((n) => { if (n >= 2) common++; });

    let html =
      '<div class="gd-head"><span class="gd-title">' + esc(g.name) + '</span>' +
      '<button class="gd-code" id="copyCode" title="Code kopieren">CODE ' + esc(g.code) + '</button></div>';

    // Wochenvergleich
    html += '<div class="gd-sub">Wochenvergleich</div>' +
      '<div class="cmp-nav">' +
      '<button class="ghost-btn" id="cmpPrev">‹</button>' +
      '<span class="cmp-label mono">' + ws.getDate() + '.' + (ws.getMonth() + 1) + '. – ' +
      we.getDate() + '.' + (we.getMonth() + 1) + '.' + we.getFullYear() + '</span>' +
      '<button class="ghost-btn" id="cmpNext">›</button></div>' +
      '<div class="cmp-table">' +
      '<div class="cmp-row"><span></span>' + WD.map((w) => '<span class="chead">' + w + '</span>').join('') + '</div>';
    memberIds.forEach((id) => {
      const m = wk.get(id) || new Map();
      html += '<div class="cmp-row"><span class="cname">' + esc(nameOf(id)) +
        (id === userId ? ' (du)' : '') + '</span>';
      for (let i = 0; i < 7; i++) {
        const k = key(addDays(ws, i));
        const l = k > tKey ? undefined : m.get(k);
        html += '<span class="cmp-cell' + (l === undefined ? '' : ' lv' + l) + '"></span>';
      }
      html += '</div>';
    });
    html += '</div>';

    // Ranking + Gruppen-Stats
    html += '<div class="gd-sub">Trinktage · letzte 30 Tage</div>';
    ranking.forEach(([id, c]) => {
      html += '<div class="rank-row"><span class="rname">' + esc(nameOf(id)) + '</span>' +
        '<span class="rank-bar"><i style="width:' + Math.round((c / maxCnt) * 100) + '%"></i></span>' +
        '<span class="rv">' + c + '</span></div>';
    });
    html += '<div class="gd-sub">Gruppen-Stats</div><div class="gd-stats">' +
      'Gruppen-Trinkquote: <em>' + groupRate + ' %</em> der Tage · ' +
      'Gemeinsame Trinktage (≥ 2 Personen): <em>' + common + '</em></div>';

    html += '<div class="gd-foot">' +
      '<button class="ghost-btn danger" id="leaveGroup">Gruppe verlassen</button>' +
      '<button class="ghost-btn" id="closeGroup">Schließen</button></div>';

    const el = $('groupDetail');
    el.innerHTML = html;

    $('copyCode').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(g.code); toast('Code kopiert: ' + g.code); }
      catch (e) { toast('Code: ' + g.code); }
    });
    $('cmpPrev').addEventListener('click', () => { cmpWeek = addDays(cmpWeek, -7); renderGroupDetail(); });
    $('cmpNext').addEventListener('click', () => { cmpWeek = addDays(cmpWeek, 7); renderGroupDetail(); });
    $('closeGroup').addEventListener('click', closeGroup);
    $('leaveGroup').addEventListener('click', async () => {
      if (!confirm('Gruppe „' + g.name + '“ wirklich verlassen?')) return;
      const { error } = await db.from('suff_group_members')
        .delete().eq('group_id', g.id).eq('user_id', userId);
      if (error) { toast('Verlassen fehlgeschlagen'); return; }
      closeGroup();
      loadGroups();
    });
  }

  // ---------- Tages-Modal ----------
  let modalDay = null;
  function openDayModal(k) {
    modalDay = k;
    const d = fromKey(k);
    $('dayModalDate').textContent = WD[wdIndex(d)] + ', ' + d.getDate() + '. ' +
      MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    $('dayModal').hidden = false;
  }

  // ---------- Events ----------
  function bindUI() {
    // Theme
    document.querySelectorAll('[data-theme-btn]').forEach((b) => {
      b.addEventListener('click', () => applyTheme(b.dataset.themeBtn));
    });

    // Logout
    $('logoutBtn').addEventListener('click', async () => {
      await window.aeAuth.signOut();
      location.href = '/projects/';
    });

    // Heute-Schnelleintrag (nochmal tippen = entfernen)
    document.querySelectorAll('[data-quick]').forEach((b) => {
      b.addEventListener('click', () => {
        const lvl = Number(b.dataset.quick);
        const k = key(today());
        setEntry(k, entries.get(k) === lvl ? null : lvl);
      });
    });

    // Ansicht wechseln
    document.querySelectorAll('#viewSeg button').forEach((b) => {
      b.addEventListener('click', () => {
        view = b.dataset.view;
        document.querySelectorAll('#viewSeg button')
          .forEach((x) => x.classList.toggle('active', x === b));
        renderCalendar();
      });
    });

    // Navigation
    $('navPrev').addEventListener('click', () => { shiftCursor(-1); });
    $('navNext').addEventListener('click', () => { shiftCursor(1); });
    $('navToday').addEventListener('click', () => { cursor = today(); renderCalendar(); });
    function shiftCursor(dir) {
      if (view === 'week') cursor = addDays(cursor, dir * 7);
      else if (view === 'month') cursor = new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
      else cursor = new Date(cursor.getFullYear() + dir, cursor.getMonth(), 1);
      renderCalendar();
    }

    // Kalender-Klicks (Delegation)
    $('calendar').addEventListener('click', (e) => {
      const mini = e.target.closest('.mini');
      if (mini) {
        cursor = new Date(cursor.getFullYear(), Number(mini.dataset.month), 1);
        view = 'month';
        document.querySelectorAll('#viewSeg button')
          .forEach((x) => x.classList.toggle('active', x.dataset.view === 'month'));
        renderCalendar();
        return;
      }
      const cell = e.target.closest('[data-day]');
      if (cell && cell.dataset.day) openDayModal(cell.dataset.day);
    });

    // Tages-Modal
    document.querySelectorAll('[data-pick]').forEach((b) => {
      b.addEventListener('click', () => {
        if (!modalDay) return;
        setEntry(modalDay, b.dataset.pick === 'del' ? null : Number(b.dataset.pick));
        $('dayModal').hidden = true;
      });
    });
    $('dayModalClose').addEventListener('click', () => { $('dayModal').hidden = true; });
    $('dayModal').addEventListener('click', (e) => {
      if (e.target === $('dayModal')) $('dayModal').hidden = true;
    });

    // Gruppen
    $('showCreate').addEventListener('click', () => {
      $('createForm').hidden = !$('createForm').hidden;
      $('joinForm').hidden = true;
      if (!$('createForm').hidden) $('createName').focus();
    });
    $('showJoin').addEventListener('click', () => {
      $('joinForm').hidden = !$('joinForm').hidden;
      $('createForm').hidden = true;
      if (!$('joinForm').hidden) $('joinCode').focus();
    });
    $('createForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('createName').value.trim();
      if (!name) return;
      const { data, error } = await db.rpc('suff_create_group', { p_name: name });
      if (error) { toast('Erstellen fehlgeschlagen'); console.error(error); return; }
      $('createName').value = '';
      $('createForm').hidden = true;
      toast('Gruppe erstellt · Code: ' + data.code);
      await loadGroups();
      openGroup(data.id);
    });
    $('joinForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = $('joinCode').value.trim().toUpperCase();
      if (code.length !== 6) { toast('Code hat 6 Zeichen'); return; }
      const { data, error } = await db.rpc('suff_join_group', { p_code: code });
      if (error) { toast('Gruppe nicht gefunden'); return; }
      $('joinCode').value = '';
      $('joinForm').hidden = true;
      toast('Beigetreten: ' + data.name);
      await loadGroups();
      openGroup(data.id);
    });
    $('groupList').addEventListener('click', (e) => {
      const item = e.target.closest('[data-group]');
      if (item) openGroup(item.dataset.group);
    });
  }

  // ---------- Boot ----------
  (async function init() {
    const session = await window.aeAuth.requireAuth();
    if (!session) return;
    userId = session.user.id;

    applyTheme((function () {
      try { return localStorage.getItem('suff_theme'); } catch (e) { return null; }
    })() || 'kneipe');

    $('app').hidden = false;
    bindUI();

    try { await loadEntries(); } catch (e) { console.error(e); toast('Laden fehlgeschlagen'); }
    renderAll();
    ensureProfile();
    loadGlobal();
    loadGroups();
  })();
})();
