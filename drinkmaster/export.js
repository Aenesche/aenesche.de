// ==========================================
// EXPORT: Endergebnis als PNG
// Die Bilder werden komplett neu auf ein Canvas gezeichnet –
// dadurch ist IMMER alles drauf (alle Türme, alle Leute), egal wie weit gescrollt ist.
// Braucht aus admin.html: client, adminRoomId, adminRoomCode
// ==========================================

const EXP = {
  bg: '#0d0d0d', panel: '#161616', line: '#333', text: '#ffffff', muted: '#888',
  cyan: '#00f3ff', pink: '#ff00ea', yellow: '#f6e05e', green: '#48bb78', red: '#e53e3e',
  font: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  MAX_PIXELS: 16000000,  // iOS Safari schafft max. ~16,7 Mio Pixel pro Canvas
  MAX_SIDE: 16000
};

// ---------- Helfer ----------
function expFont(size, weight = 'normal') { return `${weight} ${size}px ${EXP.font}`; }

function expColor(alc) {
  const anchors = [ { pct: 0, color: '#00f3ff' }, { pct: 5, color: '#f6e05e' }, { pct: 12, color: '#ed8936' }, { pct: 20, color: '#e53e3e' }, { pct: 40, color: '#ff00ea' } ];
  if (alc <= 0) return anchors[0].color;
  if (alc >= 40) return anchors[4].color;
  let lower = anchors[0], upper = anchors[1];
  for (let i = 0; i < anchors.length - 1; i++) {
    if (alc >= anchors[i].pct && alc <= anchors[i + 1].pct) { lower = anchors[i]; upper = anchors[i + 1]; break; }
  }
  const t = (alc - lower.pct) / (upper.pct - lower.pct);
  const a = parseInt(lower.color.slice(1), 16), b = parseInt(upper.color.slice(1), 16);
  const mix = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t));
  return '#' + ((1 << 24) | (mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).slice(1);
}

// Neues Canvas in "logischen" Pixeln; intern so scharf wie das Gerät es erlaubt
function expCanvas(w, h) {
  const s = Math.max(0.5, Math.min(2, Math.sqrt(EXP.MAX_PIXELS / (w * h)), EXP.MAX_SIDE / w, EXP.MAX_SIDE / h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * s);
  c.height = Math.round(h * s);
  const ctx = c.getContext('2d');
  ctx.scale(s, s);
  ctx.fillStyle = EXP.bg;
  ctx.fillRect(0, 0, w, h);
  return { c, ctx, s };
}

function expFit(ctx, text, maxW) {
  text = String(text);
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

function expRoundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, h / 2, w / 2));
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  ctx.fill();
}

// Platz 1-3 als Medaille (ohne Emoji, damit's überall gleich aussieht)
function expRank(ctx, x, y, rank) {
  const medal = ['#f6c945', '#c9ced6', '#cd7f32'][rank - 1];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (medal) {
    ctx.save();
    ctx.fillStyle = medal;
    ctx.shadowColor = medal; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#111';
    ctx.font = expFont(17, 'bold');
    ctx.fillText(rank, x, y + 1);
  } else {
    ctx.fillStyle = EXP.muted;
    ctx.font = expFont(17, 'bold');
    ctx.fillText('#' + rank, x, y + 1);
  }
  ctx.textBaseline = 'alphabetic';
}

function expHeader(ctx, w, subtitle, info) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = expFont(56, '800');
  ctx.fillStyle = EXP.text;
  ctx.fillText('DRINK', 60, 95);
  const dw = ctx.measureText('DRINK').width;
  ctx.save();
  ctx.shadowColor = 'rgba(0,243,255,0.6)'; ctx.shadowBlur = 20;
  ctx.fillStyle = EXP.cyan;
  ctx.fillText('MASTER', 60 + dw, 95);
  ctx.restore();

  ctx.font = expFont(28, 'bold');
  ctx.fillStyle = EXP.pink;
  ctx.fillText(subtitle, 60, 142);

  ctx.font = expFont(20);
  ctx.fillStyle = EXP.muted;
  ctx.fillText(expFit(ctx, info, w - 120), 60, 176);
}

function expFooter(ctx, w, h) {
  ctx.font = expFont(16);
  ctx.fillStyle = '#555';
  ctx.textAlign = 'right';
  ctx.fillText('aenesche.de/drinkmaster', w - 60, h - 22);
  ctx.textAlign = 'left';
}

function expPartyDate(rows) {
  const times = rows.map(r => new Date(r.created_at).getTime()).filter(t => !isNaN(t));
  const d = times.length ? new Date(Math.min(...times)) : new Date();
  const pad = n => String(n).padStart(2, '0');
  return { label: d.toLocaleDateString('de-DE'), iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` };
}

async function expLoad() {
  const [u, d, r] = await Promise.all([
    client.from('party_users').select('id, display_name').eq('room_id', adminRoomId),
    client.from('party_drinks').select('user_id, volume_ml, alcohol_percent, created_at').eq('room_id', adminRoomId).order('created_at', { ascending: true }),
    client.from('party_reactions').select('user_id, pure_alcohol_ml, reaction_time_ms, created_at').eq('room_id', adminRoomId)
  ]);
  const err = u.error || d.error || r.error;
  if (err) throw new Error(err.message || 'Daten konnten nicht geladen werden');
  return { users: u.data || [], drinks: d.data || [], reactions: r.data || [] };
}

async function expDownload(canvas, filename) {
  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('Bild ist zu groß für dieses Gerät');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function expRun(btnId, fn) {
  const btn = document.getElementById(btnId);
  if (!adminRoomId || btn.disabled) return;
  const label = btn.innerText;
  btn.disabled = true;
  btn.innerText = '⏳ Erstelle Bild...';
  try {
    await fn();
  } catch (e) {
    console.error(e);
    alert('Export fehlgeschlagen: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerText = label;
  }
}

function exportTowers() { return expRun('exportTowersBtn', drawTowersImage); }
function exportReactions() { return expRun('exportReactionsBtn', drawReactionsImage); }

// ==========================================
// BILD 1: JENGA-TÜRME
// ==========================================
async function drawTowersImage() {
  const { users, drinks } = await expLoad();

  const byUser = {};
  users.forEach(u => { byUser[u.id] = { name: u.display_name, score: 0, drinks: [] }; });
  drinks.forEach(d => {
    const p = byUser[d.user_id];
    if (!p) return;
    p.score += d.volume_ml * (d.alcohol_percent / 100);
    p.drinks.push(d);
  });
  const players = Object.values(byUser).filter(p => p.drinks.length > 0).sort((a, b) => b.score - a.score);
  if (players.length === 0) { alert('Noch keine Drinks eingetragen.'); return; }

  const COL_W = 140, PAD_X = 60, HEADER_H = 220, TOWER_H = 820, NAME_H = 110, FOOTER_H = 50;
  const W = Math.max(1280, PAD_X * 2 + players.length * COL_W);
  const H = HEADER_H + TOWER_H + NAME_H + FOOTER_H;
  const { c, ctx } = expCanvas(W, H);

  const totalMl = players.reduce((s, p) => s + p.score, 0);
  const date = expPartyDate(drinks);
  expHeader(ctx, W, 'Jenga-Türme · Endstand',
    `Raum ${adminRoomCode}  ·  ${date.label}  ·  ${players.length} Leute  ·  ${drinks.length} Drinks  ·  ${Math.round(totalMl)} ml Reinalkohol`);

  // Farblegende oben rechts
  const LW = 260, LX = W - 60 - LW, LY = 58;
  const grad = ctx.createLinearGradient(LX, 0, LX + LW, 0);
  [0, 5, 12, 20, 40].forEach(p => grad.addColorStop(p / 40, expColor(p)));
  ctx.fillStyle = grad;
  expRoundRect(ctx, LX, LY, LW, 12, 6);
  ctx.font = expFont(14);
  ctx.fillStyle = EXP.muted;
  ctx.textAlign = 'center';
  [0, 5, 12, 20, 40].forEach(p => ctx.fillText(p === 40 ? '40%+' : p + '%', LX + (p / 40) * LW, LY + 32));
  ctx.textAlign = 'right';
  ctx.fillText('Stärke (Vol%)', LX + LW, LY - 10);

  // Skalierung: höchster Turm füllt die Fläche, keiner ragt raus
  const baseY = HEADER_H + TOWER_H;
  const avail = TOWER_H - 60; // Platz für Zahl oben drauf
  const raw = d => Math.max(15, d.volume_ml * 0.2);
  const maxBlocks = Math.max(...players.map(p => p.drinks.length));
  let gap = 2;
  if (maxBlocks * 2 > avail * 0.25) gap = 1;
  if (maxBlocks > avail * 0.25) gap = 0;
  let scale = 3;
  players.forEach(p => {
    const sum = p.drinks.reduce((s, d) => s + raw(d), 0);
    scale = Math.min(scale, (avail - p.drinks.length * gap) / sum);
  });
  scale = Math.max(scale, 0.01);

  players.forEach((p, i) => {
    const cx = PAD_X + i * COL_W + COL_W / 2;
    let y = baseY;

    p.drinks.forEach(d => {
      const h = raw(d) * scale;
      const bw = Math.max(Math.min(40 + (d.volume_ml / 500) * 70, 110), 40);
      const col = expColor(d.alcohol_percent);
      ctx.save();
      ctx.fillStyle = col;
      ctx.shadowColor = col + '80';
      ctx.shadowBlur = 10;
      expRoundRect(ctx, cx - bw / 2, y - h, bw, h, gap ? 4 : 1);
      ctx.restore();
      y -= h + gap;
    });

    // Gesamtzahl oben auf dem Turm
    ctx.textAlign = 'center';
    ctx.font = expFont(24, 'bold');
    ctx.fillStyle = EXP.text;
    ctx.fillText(Math.round(p.score), cx, y - 26);
    ctx.font = expFont(13);
    ctx.fillStyle = EXP.muted;
    ctx.fillText('ml', cx, y - 9);

    // Platz + Name unten
    expRank(ctx, cx, baseY + 34, i + 1);
    ctx.textAlign = 'center';
    ctx.font = expFont(18, 'bold');
    ctx.fillStyle = '#ddd';
    ctx.fillText(expFit(ctx, p.name, COL_W - 12), cx, baseY + 80);
    ctx.font = expFont(14);
    ctx.fillStyle = EXP.muted;
    ctx.fillText(`${p.drinks.length} Drink${p.drinks.length === 1 ? '' : 's'}`, cx, baseY + 102);
  });

  // Boden-Linie
  ctx.fillStyle = EXP.line;
  ctx.fillRect(PAD_X - 10, baseY + 4, W - 2 * PAD_X + 20, 2);

  expFooter(ctx, W, H);
  await expDownload(c, `drinkmaster_${adminRoomCode}_${date.iso}_tuerme.png`);
}

// ==========================================
// BILD 2: REAKTIONSTESTS (Diagramm + komplette Rangliste)
// ==========================================
async function drawReactionsImage() {
  const { users, reactions } = await expLoad();
  if (reactions.length === 0) { alert('Noch keine Reaktionstests gespielt.'); return; }

  const names = {};
  users.forEach(u => { names[u.id] = u.display_name; });

  // Rangliste pro Person
  const stats = {};
  reactions.forEach(r => {
    const s = stats[r.user_id] || (stats[r.user_id] = { name: names[r.user_id] || 'Unbekannt', times: [] });
    s.times.push(r.reaction_time_ms);
  });
  const rows = Object.values(stats).map(s => ({
    name: s.name,
    best: Math.min(...s.times),
    worst: Math.max(...s.times),
    avg: Math.round(s.times.reduce((a, b) => a + b, 0) / s.times.length),
    count: s.times.length
  })).sort((a, b) => a.best - b.best || a.avg - b.avg);

  const W = 1700, PAD = 60, HEADER_H = 220, CHART_H = 820, TITLE_H = 90, HEAD_H = 44, ROW_H = 48, FOOTER_H = 70;
  const H = HEADER_H + CHART_H + TITLE_H + HEAD_H + rows.length * ROW_H + FOOTER_H;
  const { c, ctx, s } = expCanvas(W, H);

  const date = expPartyDate(reactions);
  const avgAll = Math.round(reactions.reduce((a, r) => a + r.reaction_time_ms, 0) / reactions.length);
  expHeader(ctx, W, 'Reaktionstests · Endstand',
    `Raum ${adminRoomCode}  ·  ${date.label}  ·  ${reactions.length} Tests  ·  ${rows.length} Leute  ·  Schnitt ${avgAll} ms`);

  // --- Diagramm (gleiche Logik wie auf dem Beamer) ---
  ctx.fillStyle = EXP.panel;
  expRoundRect(ctx, PAD, HEADER_H, W - 2 * PAD, CHART_H, 16);

  const scatterData = reactions.map(r => ({ x: Number(r.pure_alcohol_ml), y: r.reaction_time_ms }));
  const buckets = {};
  scatterData.forEach(p => {
    const k = Math.floor(p.x / 15);
    const b = buckets[k] || (buckets[k] = { sx: 0, sy: 0, n: 0 });
    b.sx += p.x; b.sy += p.y; b.n += 1;
  });
  const avgCurve = Object.keys(buckets).sort((a, b) => a - b).map(k => ({ x: buckets[k].sx / buckets[k].n, y: buckets[k].sy / buckets[k].n }));
  let trend = [];
  if (scatterData.length > 1) {
    const n = scatterData.length;
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    scatterData.forEach(p => { sx += p.x; sy += p.y; sxy += p.x * p.y; sxx += p.x * p.x; });
    const den = n * sxx - sx * sx;
    if (den !== 0) {
      const m = (n * sxy - sx * sy) / den, b0 = (sy - m * sx) / n;
      const maxX = Math.max(...scatterData.map(p => p.x), 50) + 20;
      trend = [{ x: 0, y: b0 }, { x: maxX, y: m * maxX + b0 }];
    }
  }

  const cw = W - 2 * PAD - 40, ch = CHART_H - 40;
  const holder = document.createElement('div');
  holder.style.cssText = `position:fixed;left:-20000px;top:0;width:${cw}px;height:${ch}px;pointer-events:none;`;
  const cc = document.createElement('canvas');
  cc.width = cw; cc.height = ch;
  holder.appendChild(cc);
  document.body.appendChild(holder);

  let chart;
  try {
    chart = new Chart(cc, {
      data: {
        datasets: [
          { type: 'scatter', label: 'Einzelne Tests', data: scatterData, backgroundColor: EXP.cyan, borderColor: EXP.cyan, pointRadius: 7 },
          { type: 'line', label: 'Durchschnittskurve', data: avgCurve, borderColor: EXP.pink, backgroundColor: 'transparent', borderWidth: 4, tension: 0.4, pointRadius: 7, pointBackgroundColor: EXP.pink },
          { type: 'line', label: 'Trendlinie', data: trend, borderColor: EXP.yellow, borderDash: [10, 5], backgroundColor: 'transparent', borderWidth: 2, pointRadius: 0, tension: 0 }
        ]
      },
      options: {
        responsive: false, animation: false, devicePixelRatio: s,
        scales: {
          x: { type: 'linear', min: 0, title: { display: true, text: 'Getrunkener Reinalkohol (ml)', color: '#ccc', font: { size: 18, weight: 'bold' } }, grid: { color: '#2a2a2a' }, ticks: { color: '#aaa', font: { size: 14 } } },
          y: { title: { display: true, text: 'Reaktionszeit (ms)', color: '#ccc', font: { size: 18, weight: 'bold' } }, grid: { color: '#2a2a2a' }, ticks: { color: '#aaa', font: { size: 14 } }, beginAtZero: false }
        },
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#fff', font: { size: 16 }, usePointStyle: true, padding: 20 } },
          tooltip: { enabled: false }
        }
      }
    });
    await new Promise(r => requestAnimationFrame(() => r()));
    ctx.drawImage(cc, PAD + 20, HEADER_H + 20, cw, ch);
  } finally {
    if (chart) chart.destroy();
    holder.remove();
  }

  // --- Rangliste (komplett, egal wie lang) ---
  let y = HEADER_H + CHART_H + 64;
  ctx.textAlign = 'left';
  ctx.font = expFont(28, 'bold');
  ctx.fillStyle = EXP.cyan;
  ctx.fillText('Rangliste · Schnellste Reaktion', PAD, y);

  y += TITLE_H - 64;
  const colName = PAD + 80;
  const cols = [
    { label: 'BESTZEIT', x: W - PAD - 470, color: EXP.green, key: 'best', unit: ' ms' },
    { label: 'SCHNITT', x: W - PAD - 320, color: EXP.text, key: 'avg', unit: ' ms' },
    { label: 'LANGSAMSTE', x: W - PAD - 150, color: EXP.red, key: 'worst', unit: ' ms' },
    { label: 'TESTS', x: W - PAD - 20, color: EXP.muted, key: 'count', unit: '' }
  ];
  ctx.font = expFont(14, 'bold');
  ctx.fillStyle = EXP.muted;
  ctx.fillText('PLATZ', PAD + 16, y + 28);
  ctx.fillText('NAME', colName, y + 28);
  ctx.textAlign = 'right';
  cols.forEach(cl => ctx.fillText(cl.label, cl.x, y + 28));
  ctx.fillStyle = EXP.line;
  ctx.fillRect(PAD, y + HEAD_H - 2, W - 2 * PAD, 2);
  y += HEAD_H;

  rows.forEach((r, i) => {
    if (i % 2 === 0) {
      ctx.fillStyle = '#141414';
      ctx.fillRect(PAD, y, W - 2 * PAD, ROW_H);
    }
    const mid = y + ROW_H / 2;
    expRank(ctx, PAD + 40, mid, i + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = expFont(20, 'bold');
    ctx.fillStyle = '#ddd';
    ctx.fillText(expFit(ctx, r.name, cols[0].x - 140 - colName), colName, mid + 1);
    ctx.textAlign = 'right';
    cols.forEach(cl => {
      ctx.font = expFont(20, cl.key === 'best' ? 'bold' : 'normal');
      ctx.fillStyle = cl.color;
      ctx.fillText(r[cl.key] + cl.unit, cl.x, mid + 1);
    });
    ctx.textBaseline = 'alphabetic';
    y += ROW_H;
  });

  expFooter(ctx, W, H);
  await expDownload(c, `drinkmaster_${adminRoomCode}_${date.iso}_reaktionstests.png`);
}
