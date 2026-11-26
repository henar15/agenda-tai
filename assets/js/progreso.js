/**
 * Estadísticas del día, nota estimada, puntos débiles, historial y vista Progreso.
 */
/* ---------- stats del día ---------- */
function statAdd(k, n) {
  const d = Object.assign({}, S.diario || {});
  const t = Object.assign({}, d[today()] || {});
  const s = Object.assign({ c: 0, q: 0, p: 0, m: 0 }, t._s || {});
  s[k] += n;
  t._s = s;
  d[today()] = t;
  S.diario = d;
  kvSet('diario');
}
const hechasDe = (o) => Object.keys(o || {}).filter((k) => k !== '_s');

/* ---------- resumen y nota estimada ---------- */
function notaEstimada() {
  const rs = S.res
    .slice()
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
    .filter((r) => r.total >= 10)
    .slice(0, 5);
  if (!rs.length) return null;
  let w = 0,
    s = 0;
  rs.forEach((r, i) => {
    const k = (5 - i) * (r.total >= 40 ? 2 : 1);
    w += k;
    s += nota(r) * k;
  });
  return s / w;
}
function vResumenDia() {
  const t = today();
  const s = ((S.diario || {})[t] || {})._s || {};
  const hoyRes = S.res.filter((r) => (r.fecha || '').slice(0, 10) === t);
  const H = planDia(new Date());
  const done = hechasDe((S.diario || {})[t]);
  const tot = (H.tareas || []).length;
  const tarde = new Date().getHours() >= 20;
  if (!tarde && !(tot && done.length >= tot)) return '';
  const nt = hoyRes.length ? hoyRes.reduce((a, r) => a + nota(r), 0) / hoyRes.length : null;
  const frase =
    done.length >= tot && tot
      ? '¡Día completo! Hoy has hecho todo lo que tocaba 💜'
      : s.c || s.q
        ? 'Cada tarjeta cuenta. Mañana seguimos 💪'
        : 'Hoy no ha habido estudio… mañana empezamos con algo pequeño 🌱';
  return `<div class="card resumen"><h3>Resumen de hoy</h3><div class="rsum"><div><b>${s.c || 0}</b><small>tarjetas</small></div><div><b>${s.q || 0}</b><small>preguntas</small></div><div><b>${s.p || 0}</b><small>páginas</small></div><div><b>${s.m || 0}</b><small>pomodoros</small></div>${nt != null ? `<div><b>${n1(nt)}</b><small>nota de hoy</small></div>` : ''}</div><p class="bubble" style="margin-bottom:0">${esc(mascName())}: ${esc(frase)}</p></div>`;
}

function vProgreso() {
  const T = S.temas,
    tot = T.length || 34,
    est = T.filter((t) => t.estado === 'estudiado').length,
    pct = Math.round((est / tot) * 100);
  const R = 2 * Math.PI * 104,
    off = R * (1 - est / tot);
  const blq = ['I', 'II', 'III', 'IV'].map((b) => {
    const ts = T.filter((t) => t.bloque === b);
    return { b, n: ts.length, e: ts.filter((t) => t.estado === 'estudiado').length };
  });
  const r = racha(),
    L = logros(),
    got = L.filter((x) => x.ok).length;
  return `<div class="hero"><div class="ring"><svg viewBox="0 0 240 240" role="img" aria-label="Temario estudiado ${pct}%"><circle cx="120" cy="120" r="104" fill="none" stroke="var(--line)" stroke-width="22"/><circle cx="120" cy="120" r="104" fill="none" stroke="var(--acc)" stroke-width="22" stroke-linecap="round" stroke-dasharray="${R}" stroke-dashoffset="${off}" transform="rotate(-90 120 120)"/></svg><div class="c"><b>${pct}%</b><span>${est} de ${tot} temas</span></div></div>
  <div><h2>Tu progreso</h2><div class="bars">${blq.map((x) => `<div class="bar"><div class="lab"><span>Bloque ${x.b}</span><span>${x.e}/${x.n}</span></div><div class="tr"><i style="width:${x.n ? (x.e / x.n) * 100 : 0}%;background:${BL[x.b].c}"></i></div></div>`).join('')}</div></div></div>
  <div class="grid" style="margin-bottom:16px"><div class="card"><div class="streak"><span class="fire">${r}</span><div><b>${r === 1 ? 'día' : 'días'} seguidos cumpliendo tu meta</b><small>${r ? 'Si un día fallas, un escudo te salva la racha' : 'Cumple la meta de hoy para empezar'}</small></div></div>${heat()}<p class="sub" style="margin:6px 0 0">Últimas 12 semanas</p></div>
  </div>${vDebiles()}<div style="height:16px"></div>${vHistorial()}<div style="height:16px"></div>${vEvolucion()}<div class="card" style="margin-top:16px"><h3>Logros · ${got} de ${L.length}</h3><div class="tr lgbar"><i style="width:${(got / L.length) * 100}%"></i></div><p class="fine" style="margin:8px 0 4px">Toca un grupo para ver sus logros.</p>${[
    ...new Set(L.map((x) => x.g)),
  ]
    .map((g) => {
      const xs = L.filter((x) => x.g === g),
        k = xs.filter((x) => x.ok).length;
      return `<details class="lgd"><summary><span>${esc(g)}</span><small>${k} de ${xs.length}</small></summary><div class="badges">${xs.map((x) => `<span class="${x.ok ? 'on' : ''}"><em aria-hidden="true">${x.ok ? esc(x.ic) : '🔒'}</em><b>${esc(x.nom)}</b><small>${esc(x.des)}</small></span>`).join('')}</div></details>`;
    })
    .join('')}</div>`;
}

/* ---------- puntos débiles y estadísticas ---------- */
function statTema(t, ok) {
  if (!t) return;
  const s = Object.assign({}, S.stats || {});
  const x = Object.assign({ a: 0, f: 0 }, s[t] || {});
  ok ? x.a++ : x.f++;
  s[t] = x;
  S.stats = s;
  clearTimeout(statTema.t);
  statTema.t = setTimeout(() => kvSet('stats'), 800);
}
function vDebiles() {
  const L = Object.entries(S.stats || {})
    .map(([t, x]) => ({ t, n: x.a + x.f, p: x.a / Math.max(1, x.a + x.f) }))
    .filter((x) => x.n >= 5)
    .sort((a, b) => a.p - b.p);
  if (!L.length)
    return `<div class="card"><h3>🎯 Tus puntos débiles</h3><p class="fine">Cuando respondas al menos 5 preguntas de un tema, aquí verás tu porcentaje de aciertos y qué temas te cuestan más.</p></div>`;
  return `<div class="card"><h3>🎯 Tus puntos débiles</h3><p class="fine">% de aciertos por tema (con 5 o más preguntas respondidas). Los de arriba son los que más fallas.</p><div class="deb">${L.map(
    (x) => {
      const tm = S.temas.find((y) => y.id === x.t);
      const col = x.p < 0.5 ? 'var(--bad)' : x.p < 0.7 ? '#f59e0b' : 'var(--ok)';
      return `<div class="drow"><span class="tag" style="background:${BL[(tm || {}).bloque || 'I'].c}">${esc(tm ? tm.codigo : x.t)}</span><div class="dbar"><div class="tr"><i style="width:${x.p * 100}%;background:${col}"></i></div><small>${Math.round(x.p * 100)} % · ${x.n} preguntas</small></div><button class="mini" data-act="practT" data-t="${esc(x.t)}">Practicar</button></div>`;
    },
  ).join('')}</div></div>`;
}
function vHistorial() {
  const weeks = [];
  for (let k = 7; k >= 0; k--) {
    const lun = addD(new Date(semKey() + 'T12:00:00'), -7 * k);
    let pts = 0,
      c = 0,
      q = 0,
      m = 0,
      p = 0;
    for (let d = 0; d < 7; d++) {
      const dk = dkey(addD(lun, d));
      pts += (S.act || {})[dk] || 0;
      const s = ((S.diario || {})[dk] || {})._s || {};
      c += s.c || 0;
      q += s.q || 0;
      m += s.m || 0;
      p += s.p || 0;
    }
    weeks.push({ lun: dkey(lun), pts, c, q, m, p });
  }
  const mx = Math.max(20, ...weeks.map((w) => w.pts));
  const cur = weeks[weeks.length - 1];
  return `<div class="card"><h3>📊 Historial de las últimas 8 semanas</h3><div class="hist" role="img" aria-label="Puntos por semana: ${weeks.map((w) => fmtD(w.lun) + ' ' + w.pts).join(', ')}">${weeks.map((w) => `<div class="hb"><span class="hv">${w.pts}</span><i style="height:${Math.max(2, (w.pts / mx) * 100)}%"></i><small>${esc(fmtD(w.lun))}</small></div>`).join('')}</div>
  <div class="rsum" style="margin-top:12px"><div><b>${cur.c}</b><small>tarjetas esta semana</small></div><div><b>${cur.q}</b><small>preguntas</small></div><div><b>${cur.p}</b><small>páginas</small></div><div><b>${cur.m}</b><small>pomodoros</small></div></div></div>`;
}

/* ---------- resultados ---------- */
function vResultados() {
  if (!S.res.length)
    return vProgreso() + '<p class="empty">Cuando hagas tests, tus notas aparecerán aquí.</p>';
  const rs = S.res.slice().sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  return (
    vProgreso() +
    `<h2>Tus notas</h2><p class="sub">Nota sobre 10 de cada test, con la penalización del examen.</p><div class="card"><div class="fig" id="chart"><svg id="chs"></svg></div></div>
  <div class="scroll" style="margin-top:20px"><table class="stack"><thead><tr><th>Fecha</th><th>Test</th><th class="n">Aciertos</th><th class="n">Fallos</th><th class="n">Blanco</th><th class="n">Nota</th></tr></thead><tbody>${rs
    .slice()
    .reverse()
    .map(
      (r) =>
        `<tr><td>${esc(fmtD((r.fecha || '').slice(0, 10)))}</td><td>${esc(r.titulo)}</td><td class="n">${r.aciertos}</td><td class="n">${r.fallos}</td><td class="n">${r.blanco || 0}</td><td class="n"><b>${n1(nota(r))}</b></td></tr>`,
    )
    .join('')}</tbody></table></div>`
  );
}
function drawChart() {
  const s = $('#chs');
  if (!s) return;
  const W = s.clientWidth,
    H = s.clientHeight;
  const rs = S.res.slice().sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  if (!W || !rs.length) return;
  const L = 40,
    R = 34,
    T = 24,
    B = 34,
    iw = W - L - R,
    ih = H - T - B;
  const x = (i) => L + (rs.length === 1 ? iw / 2 : (i * iw) / (rs.length - 1)),
    y = (v) => T + ih - (v / 10) * ih;
  let g = '';
  [0, 5, 10].forEach((v) => {
    g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 8}" y="${y(v) + 5}" text-anchor="end" font-size="13" fill="var(--muted)">${v}</text>`;
  });
  const pts = rs.map((r, i) => [x(i), y(nota(r))]);
  g += `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="var(--acc)" stroke-width="3" stroke-linejoin="round"/>`;
  const lab = W > 520 || rs.length < 6;
  pts.forEach((p, i) => {
    const v = nota(rs[i]);
    g += `<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="${v >= 5 ? '#22c55e' : '#ef4444'}" stroke="var(--bg)" stroke-width="2"/>`;
    if (lab && rs.length <= 20)
      g += `<text x="${p[0]}" y="${p[1] - 12}" text-anchor="middle" font-size="13" font-weight="800" fill="var(--ink)">${n1(v)}</text>`;
  });
  if (W > 520 && rs.length <= 12)
    rs.forEach((r, i) => {
      g += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" font-size="12" fill="var(--muted)">${esc(fmtD((r.fecha || '').slice(0, 10)))}</text>`;
    });
  s.innerHTML = g;
}
const chartRO = new ResizeObserver(drawChart);
