/* ============ TOUR RATING — app.js ============
   Routen (Hash):
   #/            Gruppenübersicht
   #/g/<id>      Orte einer Gruppe
   #/p/<id>      Ort mit Durchschnittswerten
   #/p/<id>/rate eigene Bewertung abgeben / bearbeiten
   ============================================== */
(async function () {
  'use strict';

  const CATS = window.TOUR_CATEGORIES;
  const CAT_MAIN = CATS.filter((c) => c.key !== 'general');
  const db = window.sbClient;
  const $ = (id) => document.getElementById(id);
  const app = $('app');

  const session = await aeAuth.requireAuth();
  if (!session) return;
  const me = session.user.id;

  const S = {
    groupId: null,      // aktuell geladene Gruppe
    group: null,
    places: [],
    ratings: [],        // alle Bewertungen der Gruppe
    members: [],
    names: new Map(),   // userId -> username
    sort: localGet('tr_sort') || 'new'
  };

  // ---------- Helpers ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function localGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function localSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* egal */ } }

  let toastT;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function errMsg(e) {
    const m = (e && (e.message || e.error_description)) || 'Fehler';
    return m.replace(/^.*?:\s*/, '') || m;
  }

  function fmt(n, digits = 1) {
    if (n == null || isNaN(n)) return '–';
    return n.toFixed(digits).replace('.', ',');
  }
  function fmtDate(d) {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return day + '.' + m + '.' + y.slice(2);
  }
  function todayISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }
  function nameOf(uid) {
    return S.names.get(uid) || (uid === me ? 'Du' : 'Anonym');
  }

  // Sterne-Anzeige (auch halbe/teilweise)
  function starsHTML(v, size = '') {
    const pct = v == null ? 0 : Math.max(0, Math.min(1, v / 5)) * 100;
    return '<span class="stars ' + size + '"><span class="base">★★★★★</span>' +
      '<span class="fill" style="width:' + pct + '%">★★★★★</span></span>';
  }

  function avg(list, key) {
    const vals = list.map((r) => r.scores && r.scores[key]).filter((v) => typeof v === 'number');
    if (!vals.length) return { v: null, n: 0 };
    return { v: vals.reduce((a, b) => a + b, 0) / vals.length, n: vals.length };
  }
  function flagCount(list, key) {
    const vals = list.map((r) => r.scores && r.scores[key]).filter((v) => typeof v === 'boolean');
    return { yes: vals.filter(Boolean).length, n: vals.length };
  }
  function ratingsFor(pid) { return S.ratings.filter((r) => r.place_id === pid); }

  function render(html) {
    app.innerHTML = html;
    window.scrollTo(0, 0);
  }

  // ---------- Daten ----------
  async function loadNames(ids) {
    const missing = ids.filter((id) => !S.names.has(id));
    if (!missing.length) return;
    const { data } = await db.from('profiles').select('id,username').in('id', missing);
    (data || []).forEach((p) => p.username && S.names.set(p.id, p.username));
  }

  async function loadGroup(gid, force) {
    if (S.groupId === gid && !force) return;
    const [g, pl, mem] = await Promise.all([
      db.from('tour_groups').select('id,name,owner_id').eq('id', gid).maybeSingle(),
      db.from('tour_places').select('id,group_id,name,city,visited_on,created_by,created_at')
        .eq('group_id', gid).order('created_at', { ascending: false }),
      db.from('tour_group_members').select('user_id,joined_at').eq('group_id', gid)
    ]);
    if (g.error) throw g.error;
    if (!g.data) throw new Error('Gruppe nicht gefunden (oder du bist kein Mitglied)');
    if (pl.error) throw pl.error;

    const places = pl.data || [];
    let ratings = [];
    if (places.length) {
      const r = await db.from('tour_ratings')
        .select('id,place_id,user_id,scores,comment,updated_at')
        .in('place_id', places.map((p) => p.id));
      if (r.error) throw r.error;
      ratings = r.data || [];
    }
    S.groupId = gid;
    S.group = g.data;
    S.places = places;
    S.ratings = ratings;
    S.members = mem.data || [];
    await loadNames(S.members.map((m) => m.user_id).concat(ratings.map((r) => r.user_id)));
  }

  async function ensurePlace(pid, force) {
    let p = S.places.find((x) => x.id === pid);
    if (!p || force) {
      const { data, error } = await db.from('tour_places').select('group_id').eq('id', pid).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Ort nicht gefunden');
      await loadGroup(data.group_id, true);
      p = S.places.find((x) => x.id === pid);
    }
    return p;
  }

  // ---------- Router ----------
  async function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    try {
      if (parts[0] === 'g' && parts[1]) await viewGroup(parts[1]);
      else if (parts[0] === 'p' && parts[1] && parts[2] === 'rate') await viewRate(parts[1]);
      else if (parts[0] === 'p' && parts[1]) await viewPlace(parts[1]);
      else await viewGroups();
    } catch (e) {
      console.error(e);
      render(
        '<header class="top"><a class="back" href="#/">← Gruppen</a></header>' +
        '<div class="empty"><p>' + esc(errMsg(e)) + '</p>' +
        '<a class="btn" href="#/">Zur Übersicht</a></div>');
    }
  }
  window.addEventListener('hashchange', route);

  function go(hash, replace) {
    if (replace) {
      history.replaceState(null, '', hash);
      route();
    } else if (location.hash === hash) {
      route();
    } else {
      location.hash = hash;
    }
  }

  // ============================================================
  //  1) Gruppenübersicht
  // ============================================================
  async function viewGroups() {
    render('<div class="loading mono">Lade Gruppen…</div>');
    await loadNames([me]);
    const { data, error } = await db.rpc('tour_my_groups');
    if (error) throw error;
    const groups = data || [];
    const myName = S.names.get(me);

    render(
      '<header class="top">' +
        '<a class="back" href="/projects/">← Projekte</a>' +
        '<span class="who mono">' + esc(myName || session.user.email || '') + '</span>' +
      '</header>' +
      '<section class="hero">' +
        '<h1 class="brand">TOUR<span>RATING</span></h1>' +
        '<p class="sub">Wo wir gepennt, gegessen und gespielt haben – und wie\'s war.</p>' +
      '</section>' +

      (groups.length
        ? '<h3 class="label mono">Deine Gruppen</h3><div class="list">' +
          groups.map((g) =>
            '<a class="item group" href="#/g/' + g.id + '">' +
              '<div class="item-main"><div class="item-title">' + esc(g.name) + '</div>' +
              '<div class="item-meta mono">' + g.members + ' Leute · ' + g.places + ' Orte</div></div>' +
              '<span class="chev">›</span>' +
            '</a>').join('') +
          '</div>'
        : '<p class="hint">Noch in keiner Gruppe. Tritt der Gruppe deiner Band bei oder mach eine neue auf.</p>') +

      '<div class="tabs" id="gTabs">' +
        '<button class="tab on" data-mode="join">Beitreten</button>' +
        '<button class="tab" data-mode="create">Neue Gruppe</button>' +
      '</div>' +
      '<form class="card form" id="groupForm" autocomplete="off">' +
        '<label class="field"><span>Gruppenname</span>' +
          '<input id="gName" maxlength="40" placeholder="z.B. Youlity" required autocapitalize="off"></label>' +
        '<label class="field"><span>Passwort</span>' +
          '<input id="gPass" maxlength="60" placeholder="z.B. Gabi" required autocapitalize="off"></label>' +
        '<button class="btn primary wide" id="gSubmit">Beitreten</button>' +
      '</form>'
    );

    let mode = 'join';
    $('gTabs').addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (!b) return;
      mode = b.dataset.mode;
      document.querySelectorAll('#gTabs .tab').forEach((t) => t.classList.toggle('on', t === b));
      $('gSubmit').textContent = mode === 'join' ? 'Beitreten' : 'Gruppe erstellen';
    });
    $('groupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('gName').value.trim();
      const pass = $('gPass').value;
      if (!name || !pass) return;
      const btn = $('gSubmit');
      btn.disabled = true;
      const { data: gid, error: err } = await db.rpc(
        mode === 'join' ? 'tour_join_group' : 'tour_create_group',
        { p_name: name, p_password: pass });
      btn.disabled = false;
      if (err) { toast(errMsg(err)); return; }
      go('#/g/' + gid);
    });
  }

  // ============================================================
  //  2) Orte einer Gruppe
  // ============================================================
  async function viewGroup(gid) {
    if (S.groupId !== gid) render('<div class="loading mono">Lade Orte…</div>');
    await loadGroup(gid, true);
    renderGroup();
  }

  function sortedPlaces() {
    const list = S.places.slice();
    if (S.sort === 'best') {
      list.sort((a, b) => (avg(ratingsFor(b.id), 'general').v ?? -1) - (avg(ratingsFor(a.id), 'general').v ?? -1));
    } else if (S.sort === 'az') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    } else {
      // neueste zuerst: nach Datum, sonst Erstellzeit
      list.sort((a, b) => (b.visited_on || b.created_at).localeCompare(a.visited_on || a.created_at));
    }
    return list;
  }

  function renderGroup() {
    const g = S.group;
    const total = S.members.length;
    const memberNames = S.members.map((m) => nameOf(m.user_id)).join(', ');
    const places = sortedPlaces();

    render(
      '<header class="top">' +
        '<a class="back" href="#/">← Gruppen</a>' +
        '<span class="who mono">' + total + ' Leute</span>' +
      '</header>' +
      '<section class="hero small">' +
        '<h1 class="title">' + esc(g.name) + '</h1>' +
        '<p class="sub mono">' + esc(memberNames) + '</p>' +
      '</section>' +

      (places.length
        ? '<div class="sortbar" id="sortbar">' +
            ['new:Neueste', 'best:Beste', 'az:A–Z'].map((s) => {
              const [k, l] = s.split(':');
              return '<button class="chip' + (S.sort === k ? ' on' : '') + '" data-sort="' + k + '">' + l + '</button>';
            }).join('') +
          '</div>' +
          '<div class="list">' + places.map(placeItemHTML).join('') + '</div>'
        : '<div class="empty"><p>Noch keine Orte.<br>Leg den ersten an 👇</p></div>') +

      '<button class="link-danger" id="leaveBtn">Gruppe verlassen</button>' +
      '<div class="dock"><button class="btn primary wide" id="addPlace">+ Ort hinzufügen</button></div>'
    );

    const sb = $('sortbar');
    if (sb) sb.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sort]');
      if (!b) return;
      S.sort = b.dataset.sort;
      localSet('tr_sort', S.sort);
      renderGroup();
    });
    app.querySelectorAll('[data-place]').forEach((el) => {
      el.addEventListener('click', () => {
        const pid = el.dataset.place;
        const mine = S.ratings.some((r) => r.place_id === pid && r.user_id === me);
        go(mine ? '#/p/' + pid : '#/p/' + pid + '/rate');
      });
    });
    $('addPlace').addEventListener('click', () => openPlaceSheet(null));
    $('leaveBtn').addEventListener('click', async () => {
      if (!confirm('Gruppe „' + g.name + '“ wirklich verlassen?')) return;
      const { error } = await db.from('tour_group_members').delete().eq('group_id', g.id).eq('user_id', me);
      if (error) { toast(errMsg(error)); return; }
      S.groupId = null;
      go('#/');
    });
  }

  function placeItemHTML(p) {
    const rs = ratingsFor(p.id);
    const gen = avg(rs, 'general');
    const mine = rs.some((r) => r.user_id === me);
    const meta = [p.city, fmtDate(p.visited_on)].filter(Boolean).map(esc).join(' · ');
    const mini = CAT_MAIN.map((c) => {
      const a = avg(rs, c.key);
      return a.v == null ? '' : '<span class="mini"><i>' + esc(c.short) + '</i> ' + fmt(a.v) + '</span>';
    }).join('');

    return '<button class="item place" data-place="' + p.id + '">' +
      '<div class="item-main">' +
        '<div class="item-title">' + esc(p.name) + (mine ? '' : ' <span class="badge">Neu für dich</span>') + '</div>' +
        (meta ? '<div class="item-meta mono">' + meta + '</div>' : '') +
        (mini ? '<div class="minis mono">' + mini + '</div>' : '') +
      '</div>' +
      '<div class="item-score">' +
        '<div class="big mono">' + fmt(gen.v) + '</div>' +
        starsHTML(gen.v, 'sm') +
        '<div class="count mono">' + rs.length + '/' + S.members.length + '</div>' +
      '</div>' +
    '</button>';
  }

  // ---------- Ort anlegen / bearbeiten ----------
  let editingPlace = null;
  function openPlaceSheet(place) {
    editingPlace = place;
    $('placeSheetTitle').textContent = place ? 'Ort bearbeiten' : 'Neuer Ort';
    $('pfSubmit').textContent = place ? 'Speichern' : 'Hinzufügen & bewerten';
    $('pfName').value = place ? place.name : '';
    $('pfCity').value = place ? (place.city || '') : '';
    $('pfDate').value = place ? (place.visited_on || '') : todayISO();
    $('pfDelete').hidden = !place;
    $('placeSheet').hidden = false;
    setTimeout(() => $('pfName').focus(), 50);
  }
  function closeSheet() { $('placeSheet').hidden = true; }
  $('placeSheet').addEventListener('click', (e) => {
    if (e.target === $('placeSheet') || e.target.closest('[data-close]')) closeSheet();
  });
  $('pfDelete').addEventListener('click', () => {
    if (editingPlace) { closeSheet(); deletePlace(editingPlace); }
  });
  $('placeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const row = {
      name: $('pfName').value.trim(),
      city: $('pfCity').value.trim() || null,
      visited_on: $('pfDate').value || null
    };
    if (!row.name) return;
    const btn = $('pfSubmit');
    btn.disabled = true;
    try {
      if (editingPlace) {
        const { error } = await db.from('tour_places').update(row).eq('id', editingPlace.id);
        if (error) throw error;
        Object.assign(editingPlace, row);
        closeSheet();
        route();
      } else {
        row.group_id = S.groupId;
        row.created_by = me;
        const { data, error } = await db.from('tour_places').insert(row).select().single();
        if (error) throw error;
        S.places.unshift(data);
        closeSheet();
        go('#/p/' + data.id + '/rate');
      }
    } catch (err) {
      toast(errMsg(err));
    } finally {
      btn.disabled = false;
    }
  });

  // ============================================================
  //  3) Ort-Detail mit Durchschnittswerten
  // ============================================================
  async function viewPlace(pid) {
    const p = await ensurePlace(pid);
    const rs = ratingsFor(pid);
    const gen = avg(rs, 'general');
    const mine = rs.find((r) => r.user_id === me);
    const meta = [p.city, fmtDate(p.visited_on)].filter(Boolean).map(esc).join(' · ');

    const catCards = CAT_MAIN.map((c) => catCardHTML(c, rs)).join('');

    const people = rs.slice().sort((a, b) => (b.scores.general || 0) - (a.scores.general || 0)).map((r) =>
      '<div class="person">' +
        '<div class="person-head">' +
          '<b>' + esc(nameOf(r.user_id)) + '</b>' + starsHTML(r.scores.general, 'sm') +
        '</div>' +
        (r.comment ? '<p class="quote">' + esc(r.comment) + '</p>' : '') +
        '<div class="minis mono">' + CAT_MAIN.map((c) =>
          typeof r.scores[c.key] === 'number'
            ? '<span class="mini"><i>' + esc(c.short) + '</i> ' + r.scores[c.key] + '</span>' : '').join('') +
        '</div>' +
      '</div>').join('');

    const missing = S.members.filter((m) => !rs.some((r) => r.user_id === m.user_id)).map((m) => nameOf(m.user_id));

    render(
      '<header class="top">' +
        '<a class="back" href="#/g/' + p.group_id + '">← ' + esc(S.group.name) + '</a>' +
        (p.created_by === me ? '<button class="ghost mono" id="editPlace">Bearbeiten</button>' : '') +
      '</header>' +
      '<section class="hero small">' +
        '<h1 class="title">' + esc(p.name) + '</h1>' +
        (meta ? '<p class="sub mono">' + meta + '</p>' : '') +
      '</section>' +

      '<div class="card overall">' +
        '<div class="overall-num mono">' + fmt(gen.v) + '</div>' +
        '<div>' + starsHTML(gen.v, 'lg') +
          '<div class="count mono">' + rs.length + ' von ' + S.members.length + ' haben bewertet</div>' +
          (missing.length ? '<div class="count mono dim">fehlt: ' + esc(missing.join(', ')) + '</div>' : '') +
        '</div>' +
      '</div>' +

      (rs.length ? catCards : '') +

      (people ? '<h3 class="label mono">Einzelbewertungen</h3><div class="people">' + people + '</div>' : '') +

      '<div class="dock"><a class="btn ' + (mine ? '' : 'primary ') + 'wide" href="#/p/' + p.id + '/rate">' +
        (mine ? 'Meine Bewertung bearbeiten' : 'Jetzt bewerten') + '</a></div>'
    );

    const ed = $('editPlace');
    if (ed) ed.addEventListener('click', () => openPlaceSheet(p));
  }

  async function deletePlace(p) {
    if (!confirm('„' + p.name + '“ inkl. aller Bewertungen löschen?')) return;
    const { error } = await db.from('tour_places').delete().eq('id', p.id);
    if (error) { toast(errMsg(error)); return; }
    S.places = S.places.filter((x) => x.id !== p.id);
    S.ratings = S.ratings.filter((r) => r.place_id !== p.id);
    go('#/g/' + p.group_id, true);
  }

  function catCardHTML(c, rs) {
    const main = avg(rs, c.key);
    const anySub = c.subs.some((s) => avg(rs, s.key).n);
    const anyFlag = c.flags.some((f) => flagCount(rs, f.key).n);
    if (main.v == null && !anySub && !anyFlag) {
      return '<div class="card cat off"><div class="cat-head"><h2>' + esc(c.label) + '</h2>' +
        '<span class="mono dim">keine Angaben</span></div></div>';
    }

    const flags = c.flags.map((f) => {
      const fc = flagCount(rs, f.key);
      if (!fc.n) return '';
      const cls = fc.yes === 0 ? 'no' : (fc.yes === fc.n ? 'yes' : 'some');
      return '<span class="flag ' + cls + '">' + esc(f.label) + ' <i class="mono">' + fc.yes + '/' + fc.n + '</i></span>';
    }).join('');

    const subs = c.subs.map((s) => {
      const a = avg(rs, s.key);
      const pct = a.v == null ? 0 : (a.v / s.max) * 100;
      return '<div class="bar-row' + (s.max === 10 ? ' meter' : '') + '">' +
        '<span class="bar-label">' + esc(s.label) + '</span>' +
        '<span class="bar"><span style="width:' + pct + '%"></span></span>' +
        '<span class="bar-val mono">' + fmt(a.v) + (s.max === 10 ? '<i>/10</i>' : '') + '</span>' +
      '</div>';
    }).join('');

    return '<div class="card cat">' +
      '<div class="cat-head"><h2>' + esc(c.label) + '</h2>' +
        '<span class="cat-score">' + starsHTML(main.v, 'sm') + '<b class="mono">' + fmt(main.v) + '</b></span>' +
      '</div>' +
      (flags ? '<div class="flags">' + flags + '</div>' : '') +
      subs +
    '</div>';
  }

  // ============================================================
  //  4) Bewertungsbogen
  // ============================================================
  async function viewRate(pid) {
    const p = await ensurePlace(pid, true);
    const existing = S.ratings.find((r) => r.place_id === pid && r.user_id === me);
    const draft = Object.assign({}, existing ? existing.scores : {});
    const skipped = new Set();
    if (existing) {
      CAT_MAIN.forEach((c) => {
        const keys = [c.key].concat(c.subs.map((s) => s.key));
        if (!keys.some((k) => typeof draft[k] === 'number')) skipped.add(c.key);
      });
    }

    const starInput = (key, max, label, hint, big) => {
      const cur = draft[key];
      let btns = '';
      for (let i = 1; i <= max; i++) {
        btns += '<button type="button" class="' + (max === 10 ? 'pill' : 'star') +
          (cur != null && i <= cur ? ' on' : '') + (cur === i ? ' cur' : '') +
          '" data-key="' + key + '" data-val="' + i + '">' + (max === 10 ? i : '★') + '</button>';
      }
      return '<div class="rate-row' + (big ? ' big' : '') + (max === 10 ? ' ten' : '') + '">' +
        '<div class="rate-label">' + esc(label) + (hint ? '<small>' + esc(hint) + '</small>' : '') +
          '<span class="rate-val mono" data-show="' + key + '">' + (cur != null ? cur + '/' + max : '–') + '</span>' +
        '</div>' +
        '<div class="rate-input ' + (max === 10 ? 'pills' : 'stars-in') + '">' + btns + '</div>' +
      '</div>';
    };

    const sections = CATS.map((c) => {
      const isGen = c.key === 'general';
      const off = skipped.has(c.key);
      return '<section class="card rate-sec' + (off ? ' off' : '') + '" data-sec="' + c.key + '">' +
        '<div class="sec-head"><h2>' + esc(c.label) + '</h2>' +
          (isGen ? '<span class="req mono">Pflicht</span>'
            : '<button type="button" class="skip mono" data-skip="' + c.key + '">' +
              (off ? 'Doch bewerten' : esc(c.skipLabel || 'Überspringen')) + '</button>') +
        '</div>' +
        '<div class="sec-body">' +
          starInput(c.key, 5, isGen ? 'Gesamteindruck' : c.label + ' insgesamt', null, true) +
          (c.flags.length
            ? '<div class="toggles">' + c.flags.map((f) =>
                '<button type="button" class="toggle' + (draft[f.key] === true ? ' on' : '') +
                '" data-flag="' + f.key + '">' + esc(f.label) + '</button>').join('') + '</div>'
            : '') +
          c.subs.map((s) => starInput(s.key, s.max, s.label, s.hint)).join('') +
          (c.comment
            ? '<label class="field"><span>Kurze Bewertung (optional)</span>' +
              '<textarea id="comment" maxlength="1000" rows="3" placeholder="Was war gut, was war scheiße?">' +
              esc(existing ? existing.comment || '' : '') + '</textarea></label>'
            : '') +
        '</div>' +
      '</section>';
    }).join('');

    render(
      '<header class="top">' +
        '<a class="back" href="#/g/' + p.group_id + '">← ' + esc(S.group.name) + '</a>' +
        (existing ? '' : '<a class="ghost mono" href="#/p/' + p.id + '">Nur ansehen →</a>') +
      '</header>' +
      '<section class="hero small">' +
        '<p class="eyebrow mono">' + (existing ? 'Bewertung bearbeiten' : 'Bewerten') + '</p>' +
        '<h1 class="title">' + esc(p.name) + '</h1>' +
      '</section>' +
      '<form id="rateForm">' + sections +
        (existing ? '<button type="button" class="link-danger" id="delRating">Meine Bewertung löschen</button>' : '') +
        '<div class="dock"><button class="btn primary wide" id="saveRating">Speichern</button></div>' +
      '</form>'
    );

    const form = $('rateForm');

    function paintKey(key) {
      const v = draft[key];
      form.querySelectorAll('[data-key="' + key + '"]').forEach((b) => {
        const i = +b.dataset.val;
        b.classList.toggle('on', v != null && i <= v);
        b.classList.toggle('cur', v === i);
      });
      const show = form.querySelector('[data-show="' + key + '"]');
      const max = form.querySelectorAll('[data-key="' + key + '"]').length;
      if (show) show.textContent = v != null ? v + '/' + max : '–';
    }

    form.addEventListener('click', (e) => {
      const rb = e.target.closest('[data-key]');
      if (rb) {
        const k = rb.dataset.key;
        const v = +rb.dataset.val;
        // gleicher Wert nochmal → zurücksetzen (außer Generell)
        if (draft[k] === v && k !== 'general') delete draft[k];
        else draft[k] = v;
        paintKey(k);
        // Wer in einer übersprungenen Sektion tippt, will sie doch bewerten
        const sec = rb.closest('[data-sec]');
        if (sec && skipped.has(sec.dataset.sec)) toggleSkip(sec.dataset.sec);
        return;
      }
      const fb = e.target.closest('[data-flag]');
      if (fb) {
        const k = fb.dataset.flag;
        draft[k] = !(draft[k] === true);
        fb.classList.toggle('on', draft[k]);
        return;
      }
      const sk = e.target.closest('[data-skip]');
      if (sk) toggleSkip(sk.dataset.skip);
    });

    function toggleSkip(key) {
      const c = CATS.find((x) => x.key === key);
      const sec = form.querySelector('[data-sec="' + key + '"]');
      const btn = sec.querySelector('[data-skip]');
      if (skipped.has(key)) {
        skipped.delete(key);
        sec.classList.remove('off');
        btn.textContent = c.skipLabel || 'Überspringen';
      } else {
        skipped.add(key);
        sec.classList.add('off');
        btn.textContent = 'Doch bewerten';
      }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (typeof draft.general !== 'number') {
        toast('Bitte mindestens „Generell“ bewerten');
        form.querySelector('[data-sec="general"]').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const scores = { general: draft.general };
      CAT_MAIN.forEach((c) => {
        if (skipped.has(c.key)) return;
        const numKeys = [c.key].concat(c.subs.map((s) => s.key));
        const hasAny = numKeys.some((k) => typeof draft[k] === 'number');
        if (!hasAny) return; // nichts angetippt = gilt als übersprungen
        numKeys.forEach((k) => { if (typeof draft[k] === 'number') scores[k] = draft[k]; });
        c.flags.forEach((f) => { scores[f.key] = draft[f.key] === true; });
      });
      const comment = ($('comment') && $('comment').value.trim()) || null;

      const btn = $('saveRating');
      btn.disabled = true;
      const { data, error } = await db.from('tour_ratings').upsert({
        place_id: p.id,
        user_id: me,
        scores,
        comment,
        updated_at: new Date().toISOString()
      }, { onConflict: 'place_id,user_id' }).select('id,place_id,user_id,scores,comment,updated_at').single();
      btn.disabled = false;
      if (error) { toast(errMsg(error)); return; }

      S.ratings = S.ratings.filter((r) => !(r.place_id === p.id && r.user_id === me));
      S.ratings.push(data);
      toast('Gespeichert');
      go('#/p/' + p.id, true);
    });

    const del = $('delRating');
    if (del) del.addEventListener('click', async () => {
      if (!confirm('Deine Bewertung für „' + p.name + '“ löschen?')) return;
      const { error } = await db.from('tour_ratings').delete().eq('place_id', p.id).eq('user_id', me);
      if (error) { toast(errMsg(error)); return; }
      S.ratings = S.ratings.filter((r) => !(r.place_id === p.id && r.user_id === me));
      go('#/g/' + p.group_id, true);
    });
  }

  route();
})();
