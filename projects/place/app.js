/* ============ PLACE — app.js ============ */
(async function () {
  'use strict';

  const SIZE = 500;
  const COOLDOWN = 30; // Sekunden – muss zur DB passen (place_pixel)
  const PALETTE = [
    '#ffffff', '#e4e4e4', '#888888', '#222222',
    '#ffa7d1', '#e50000', '#e59500', '#a06a42',
    '#e5d900', '#94e044', '#02be01', '#00d3dd',
    '#0083c7', '#0000ea', '#cf6ee4', '#820080'
  ];
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 64;
  const TAP_ZOOM = 12;     // Zoomstufe nach Tap im rausgezoomten Zustand
  const TAP_SLOP = 7;      // px Bewegung, ab der es kein Tap mehr ist

  const session = await aeAuth.requireAuth();
  if (!session) return;
  const db = window.sbClient;
  const userId = session.user.id;

  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  const view = $('view');
  const ctx = view.getContext('2d');

  // ---------- Offscreen-Canvas mit den echten Pixeln ----------
  const off = document.createElement('canvas');
  off.width = off.height = SIZE;
  const offCtx = off.getContext('2d');
  const pixels = new Uint8Array(SIZE * SIZE); // Farbindex je Feld

  const RGBA32 = PALETTE.map((hex) => {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; // little endian
  });

  function paintAll() {
    const img = offCtx.createImageData(SIZE, SIZE);
    const buf = new Uint32Array(img.data.buffer);
    for (let i = 0; i < pixels.length; i++) buf[i] = RGBA32[pixels[i]] || RGBA32[0];
    offCtx.putImageData(img, 0, 0);
  }

  function setPixel(x, y, c) {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || !PALETTE[c]) return;
    pixels[y * SIZE + x] = c;
    offCtx.fillStyle = PALETTE[c];
    offCtx.fillRect(x, y, 1, 1);
    requestRender();
  }

  // ---------- View-State ----------
  let W = 0, H = 0, dpr = 1;
  let scale = 1, ox = 0, oy = 0;
  let sel = null;               // {x, y}
  let color = null;             // Palettenindex
  try {
    const saved = parseInt(localStorage.getItem('place_color'), 10);
    if (saved >= 0 && saved < PALETTE.length) color = saved;
  } catch (_) { /* egal */ }

  function resize() {
    const r = stage.getBoundingClientRect();
    const firstTime = W === 0;
    const cx = W ? (W / 2 - ox) / scale : SIZE / 2;
    const cy = H ? (H / 2 - oy) / scale : SIZE / 2;
    W = r.width; H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    view.width = Math.round(W * dpr);
    view.height = Math.round(H * dpr);
    view.style.width = W + 'px';
    view.style.height = H + 'px';
    if (firstTime) fit(false);
    else { ox = W / 2 - cx * scale; oy = H / 2 - cy * scale; clampView(); }
    requestRender();
  }

  function fitScale() { return Math.max(MIN_SCALE, Math.min(W, H) / SIZE * 0.94); }

  function fit(animated) {
    const s = fitScale();
    if (animated) return animateTo(s, SIZE / 2, SIZE / 2);
    scale = s;
    ox = (W - SIZE * s) / 2;
    oy = (H - SIZE * s) / 2;
    requestRender();
  }

  function clampView() {
    const m = 60; // so viel vom Canvas bleibt mindestens sichtbar
    const cw = SIZE * scale, ch = SIZE * scale;
    ox = Math.min(W - Math.min(m, cw), Math.max(Math.min(m, cw) - cw, ox));
    oy = Math.min(H - Math.min(m, ch), Math.max(Math.min(m, ch) - ch, oy));
  }

  function zoomAt(px, py, factor) {
    const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    const cx = (px - ox) / scale, cy = (py - oy) / scale;
    scale = ns;
    ox = px - cx * ns;
    oy = py - cy * ns;
    clampView();
    requestRender();
  }

  // ---------- Animation ----------
  let anim = null;
  function animateTo(targetScale, cx, cy, ms = 280) {
    const s0 = scale;
    const c0x = (W / 2 - ox) / scale, c0y = (H / 2 - oy) / scale;
    const t0 = performance.now();
    anim = { cancel: false };
    const me = anim;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    function step(now) {
      if (me.cancel) return;
      const t = Math.min(1, (now - t0) / ms), e = ease(t);
      scale = Math.exp(Math.log(s0) + (Math.log(targetScale) - Math.log(s0)) * e);
      const x = c0x + (cx - c0x) * e, y = c0y + (cy - c0y) * e;
      ox = W / 2 - x * scale;
      oy = H / 2 - y * scale;
      clampView();
      render();
      if (t < 1) requestAnimationFrame(step); else anim = null;
    }
    requestAnimationFrame(step);
  }
  function stopAnim() { if (anim) { anim.cancel = true; anim = null; } }

  // ---------- Rendern ----------
  let renderQueued = false;
  function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; render(); });
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, view.width, view.height);

    // Canvas
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0);

    // Ab hier in Screen-Koordinaten
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cw = SIZE * scale;
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox - 0.5, oy - 0.5, cw + 1, cw + 1);

    // Raster bei starkem Zoom
    if (scale >= 14) {
      const x0 = Math.max(0, Math.floor(-ox / scale)), x1 = Math.min(SIZE, Math.ceil((W - ox) / scale));
      const y0 = Math.max(0, Math.floor(-oy / scale)), y1 = Math.min(SIZE, Math.ceil((H - oy) / scale));
      ctx.beginPath();
      for (let x = x0; x <= x1; x++) {
        const sx = Math.round(ox + x * scale) + 0.5;
        ctx.moveTo(sx, oy + y0 * scale); ctx.lineTo(sx, oy + y1 * scale);
      }
      for (let y = y0; y <= y1; y++) {
        const sy = Math.round(oy + y * scale) + 0.5;
        ctx.moveTo(ox + x0 * scale, sy); ctx.lineTo(ox + x1 * scale, sy);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.10)';
      ctx.stroke();
    }

    // Auswahl + Farbvorschau
    if (sel) {
      const sx = ox + sel.x * scale, sy = oy + sel.y * scale, s = scale;
      if (color !== null) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = PALETTE[color];
        ctx.fillRect(sx, sy, s, s);
        ctx.globalAlpha = 1;
      }
      const pad = Math.max(3, s * 0.14);
      const rx = sx - pad, ry = sy - pad, rs = s + pad * 2;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeRect(rx, ry, rs, rs);
      ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(rx, ry, rs, rs);
    }
  }

  // ---------- Eingabe: Pan, Pinch, Tap, Wheel ----------
  const pointers = new Map();
  let gesture = null;
  let tapCandidate = false;

  function local(e) {
    const r = view.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function startGesture() {
    const pts = [...pointers.values()];
    if (pts.length === 1) {
      gesture = { type: 'pan', sx: pts[0].x, sy: pts[0].y, ox, oy, panning: !tapCandidate };
    } else if (pts.length >= 2) {
      const [a, b] = pts;
      tapCandidate = false;
      gesture = {
        type: 'pinch',
        d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        cx: ((a.x + b.x) / 2 - ox) / scale,
        cy: ((a.y + b.y) / 2 - oy) / scale,
        s0: scale
      };
    } else gesture = null;
  }

  view.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    view.setPointerCapture(e.pointerId);
    stopAnim();
    if (pointers.size === 0) tapCandidate = true;
    pointers.set(e.pointerId, local(e));
    startGesture();
  });

  view.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, local(e));
    if (!gesture) return;

    if (gesture.type === 'pan') {
      const p = pointers.values().next().value;
      const dx = p.x - gesture.sx, dy = p.y - gesture.sy;
      if (!gesture.panning && Math.hypot(dx, dy) > TAP_SLOP) {
        gesture.panning = true;
        tapCandidate = false;
        view.classList.add('grabbing');
      }
      if (gesture.panning) {
        ox = gesture.ox + dx;
        oy = gesture.oy + dy;
        clampView();
        requestRender();
      }
    } else if (gesture.type === 'pinch') {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, gesture.s0 * d / gesture.d0));
      ox = mx - gesture.cx * scale;
      oy = my - gesture.cy * scale;
      clampView();
      requestRender();
    }
  });

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      view.classList.remove('grabbing');
      if (tapCandidate && e.type === 'pointerup') handleTap(p.x, p.y);
      tapCandidate = false;
      gesture = null;
    } else {
      startGesture(); // verbleibenden Finger neu als Pan-Basis nehmen
      if (gesture) gesture.panning = true;
    }
  }
  view.addEventListener('pointerup', endPointer);
  view.addEventListener('pointercancel', endPointer);

  view.addEventListener('wheel', (e) => {
    e.preventDefault();
    stopAnim();
    const p = local(e);
    if (e.ctrlKey) zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.01));          // Trackpad-Pinch
    else if (e.deltaMode === 0 && Math.abs(e.deltaX) > 0 && !e.shiftKey) { // Trackpad-Scroll = Pan
      ox -= e.deltaX; oy -= e.deltaY; clampView(); requestRender();
    } else zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0015)));
  }, { passive: false });

  // Safari-Gesten blocken (sonst zoomt die ganze Seite)
  ['gesturestart', 'gesturechange'].forEach((t) => document.addEventListener(t, (e) => e.preventDefault()));

  function handleTap(px, py) {
    const x = Math.floor((px - ox) / scale), y = Math.floor((py - oy) / scale);
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) { select(null); return; }
    select({ x, y });
    if (scale < TAP_ZOOM * 0.6) animateTo(TAP_ZOOM, x + 0.5, y + 0.5);
  }

  $('zoomIn').addEventListener('click', () => { stopAnim(); zoomAt(W / 2, H / 2, 1.6); });
  $('zoomOut').addEventListener('click', () => { stopAnim(); zoomAt(W / 2, H / 2, 1 / 1.6); });
  $('zoomFit').addEventListener('click', () => { stopAnim(); fit(true); });

  // ---------- Auswahl & Pixel-Info ----------
  let infoTimer = null, infoSeq = 0;

  function select(p) {
    sel = p;
    $('coords').textContent = p ? `(${p.x}, ${p.y})` : '—';
    clearTimeout(infoTimer);
    if (!p) {
      $('owner').textContent = 'Tippe auf ein Feld';
    } else {
      $('owner').textContent = '…';
      infoTimer = setTimeout(loadInfo, 180);
    }
    updateButton();
    requestRender();
  }

  async function loadInfo() {
    if (!sel) return;
    const { x, y } = sel, seq = ++infoSeq;
    const { data, error } = await db.rpc('place_pixel_info', { p_x: x, p_y: y });
    if (seq !== infoSeq || !sel || sel.x !== x || sel.y !== y) return;
    const el = $('owner');
    if (error) { el.textContent = ''; return; }
    if (!data) { el.textContent = 'Noch frei'; return; }
    el.innerHTML = `von <b>${esc(data.username)}</b> · ${ago(data.placed_at)}`;
  }

  function ago(ts) {
    const s = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
    if (s < 60) return 'gerade eben';
    const m = Math.round(s / 60);
    if (m < 60) return `vor ${m} Min`;
    const h = Math.round(m / 60);
    if (h < 24) return `vor ${h} Std`;
    const d = Math.round(h / 24);
    return d === 1 ? 'vor 1 Tag' : `vor ${d} Tagen`;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  // ---------- Palette ----------
  const paletteEl = $('palette');
  PALETTE.forEach((hex, i) => {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.style.background = hex;
    b.setAttribute('aria-label', 'Farbe ' + hex);
    b.addEventListener('click', () => setColor(i));
    paletteEl.appendChild(b);
  });

  function setColor(i) {
    color = i;
    try { localStorage.setItem('place_color', String(i)); } catch (_) { /* egal */ }
    [...paletteEl.children].forEach((el, j) => el.classList.toggle('active', j === i));
    updateButton();
    requestRender();
  }
  if (color !== null) setColor(color);

  // ---------- Cooldown & Setzen ----------
  const btn = $('placeBtn');
  const label = $('placeLabel');
  let cooldownEnd = 0;
  let placing = false;

  function remaining() { return Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000)); }

  function updateButton() {
    const r = remaining();
    btn.classList.toggle('cooling', r > 0);
    btn.style.setProperty('--p', r > 0 ? (100 - (r / COOLDOWN) * 100) + '%' : '0%');
    if (r > 0) label.textContent = `0:${String(r).padStart(2, '0')}`;
    else if (placing) label.textContent = 'Setze…';
    else if (!sel) label.textContent = 'Feld wählen';
    else if (color === null) label.textContent = 'Farbe wählen';
    else label.textContent = 'Pixel setzen';
    btn.disabled = r > 0 || placing || !sel || color === null;
  }
  setInterval(updateButton, 250);

  async function place() {
    if (btn.disabled || !sel || color === null) return;
    const { x, y } = sel, c = color;
    const prev = pixels[y * SIZE + x];
    placing = true;
    setPixel(x, y, c);              // optimistisch
    cooldownEnd = Date.now() + COOLDOWN * 1000;
    updateButton();

    const { data, error } = await db.rpc('place_pixel', { p_x: x, p_y: y, p_color: c });
    placing = false;
    if (error || !data || !data.ok) {
      setPixel(x, y, prev);
      if (data && !data.ok) {
        cooldownEnd = Date.now() + data.wait * 1000;
        toast(`Noch ${data.wait}s warten`);
      } else {
        cooldownEnd = 0;
        toast(error && error.message === 'not_authenticated' ? 'Bitte neu einloggen' : 'Hat nicht geklappt – nochmal versuchen');
      }
    } else {
      cooldownEnd = Date.now() + data.wait * 1000;
      $('myTotal').textContent = data.total;
      if (navigator.vibrate) navigator.vibrate(12);
      loadInfo();
    }
    updateButton();
  }
  btn.addEventListener('click', place);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') place();
    else if (e.key === 'Escape') select(null);
    else if (e.key === '+' || e.key === '=') zoomAt(W / 2, H / 2, 1.6);
    else if (e.key === '-') zoomAt(W / 2, H / 2, 1 / 1.6);
  });

  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // ---------- Daten laden + Realtime ----------
  let live = false;
  const buffered = [];

  function onRemote(n) {
    if (!n || n.x == null) return;
    if (!live) { buffered.push(n); return; }
    setPixel(n.x, n.y, n.color);
    if (sel && sel.x === n.x && sel.y === n.y) loadInfo();
  }

  async function loadSnapshot() {
    live = false;
    buffered.length = 0;
    const { data, error } = await db.rpc('place_snapshot');
    if (error || typeof data !== 'string') {
      $('loading').textContent = 'Konnte Canvas nicht laden';
      $('loading').hidden = false;
      return;
    }
    const bin = atob(data.replace(/\s/g, ''));
    const n = Math.min(bin.length, pixels.length);
    for (let i = 0; i < n; i++) pixels[i] = bin.charCodeAt(i);
    paintAll();
    live = true;
    buffered.splice(0).forEach(onRemote);
    $('loading').hidden = true;
    requestRender();
  }

  async function loadStatus() {
    const { data } = await db.rpc('place_status');
    if (!data) return;
    cooldownEnd = Date.now() + data.wait * 1000;
    $('myTotal').textContent = data.total;
    updateButton();
  }

  const channel = db.channel('place', { config: { presence: { key: userId } } });
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'place_pixels' }, (p) => onRemote(p.new))
    .on('presence', { event: 'sync' }, () => {
      $('onlineCount').textContent = Object.keys(channel.presenceState()).length;
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') channel.track({ at: Date.now() });
    });

  // Nach längerer Abwesenheit (iPad im Standby) neu synchronisieren
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > 20000) { loadSnapshot(); loadStatus(); }
  });

  window.addEventListener('resize', resize);
  resize();
  paintAll();
  await Promise.all([loadSnapshot(), loadStatus()]);
})();
