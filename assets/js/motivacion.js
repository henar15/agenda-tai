/**
 * Pipo (la mascota), racha, meta diaria, escudos, logros y retos semanales.
 */
/* ---------- motivación ---------- */
const today = () => {
  const d = new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
};
const dkey = (d) =>
  d.getFullYear() +
  '-' +
  String(d.getMonth() + 1).padStart(2, '0') +
  '-' +
  String(d.getDate()).padStart(2, '0');
function logAct(n) {
  const k = today();
  const v = ((S.act || {})[k] || 0) + (n || 1);
  S.act = Object.assign({}, S.act, { [k]: v });
  kvSet('actividad');
  const ok = (S.rec || {}).ok || {};
  if (v >= metaDia() && !ok[k]) {
    S.rec = Object.assign({}, S.rec, { ok: Object.assign({}, ok, { [k]: 1 }) });
    kvSet('records');
    toast('🎯', '¡Meta de hoy cumplida!', mascName() + ' está feliz');
  }
}
function toast(ic, t, sub) {
  const x = document.createElement('div');
  x.className = 'toast';
  x.setAttribute('role', 'status');
  x.innerHTML = `<span aria-hidden="true">${esc(ic)}</span><div><small>${esc(t)}</small><b>${esc(sub)}</b></div>`;
  document.body.appendChild(x);
  setTimeout(() => x.remove(), 4000);
}
function heat() {
  const a = S.act || {};
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7 * 12 + 1 - ((start.getDay() + 6) % 7) + ((end.getDay() + 6) % 7));
  let cols = '',
    d = new Date(start);
  const mx = Math.max(5, ...Object.values(a));
  while (d <= end) {
    let col = '';
    for (let i = 0; i < 7; i++) {
      const k = dkey(d);
      const v = a[k] || 0;
      const op = v ? 0.25 + 0.75 * Math.min(1, v / mx) : 0;
      col += `<i title="${esc(k)}: ${v}" style="background:${v ? `color-mix(in srgb,var(--acc) ${Math.round(op * 100)}%,var(--panel))` : 'var(--line)'}${d > end ? ';visibility:hidden' : ''}"></i>`;
      d.setDate(d.getDate() + 1);
    }
    cols += `<div>${col}</div>`;
  }
  return `<div class="heat">${cols}</div>`;
}
function logros() {
  let sabe = 0;
  Object.entries(S.cards).forEach(([t, cs]) => {
    const p = S.piles[t] || {};
    cs.forEach((c) => {
      if (p[c.id] === 3) sabe++;
    });
  });
  const r = racha(),
    T = S.temas,
    est = T.filter((t) => t.estado === 'estudiado').length,
    notas = S.res.map(nota),
    best = notas.length ? Math.max(...notas) : 0,
    n = S.res.length,
    sims = S.res.filter((x) => /simulacro/i.test(x.titulo || '')).length,
    rec = S.rec || {},
    dias = Object.keys(S.act || {}).length,
    tareas = Object.keys((S.planHecho || {}).h || {}).length,
    blq = (b) => {
      const ts = T.filter((t) => t.bloque === b);
      return ts.length && ts.every((t) => t.estado === 'estudiado');
    },
    seguidos = (() => {
      let m = 0,
        c = 0;
      S.res
        .slice()
        .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
        .forEach((x) => {
          c = nota(x) >= 7 ? c + 1 : 0;
          m = Math.max(m, c);
        });
      return m;
    })(),
    errCero = n >= 5 && !errList().length,
    tipicas = Object.entries(S.cards).reduce(
      (a, [t, cs]) => a + cs.filter((c) => c.t && (S.piles[t] || {})[c.id] === 3).length,
      0,
    );
  const L = (id, ic, g, nom, des, ok) => ({ id, ic, g, nom, des, ok: !!ok });
  return [
    L('c10', '🃏', 'Tarjetas', 'Primeras tarjetas', 'Te sabes 10 tarjetas', sabe >= 10),
    L('c50', '🃏', 'Tarjetas', 'Cogiendo ritmo', '50 tarjetas sabidas', sabe >= 50),
    L('c100', '💯', 'Tarjetas', 'Cien', '100 tarjetas sabidas', sabe >= 100),
    L('c250', '🧠', 'Tarjetas', 'Memoria de elefante', '250 tarjetas sabidas', sabe >= 250),
    L('c500', '🐘', 'Tarjetas', 'Quinientas', '500 tarjetas sabidas', sabe >= 500),
    L('c1000', '🏛️', 'Tarjetas', 'Enciclopedia', '1.000 tarjetas sabidas', sabe >= 1000),
    L('tip25', '⭐', 'Tarjetas', 'Lo que cae', '25 típicas de examen sabidas', tipicas >= 25),
    L('tip100', '🌟', 'Tarjetas', 'Cazatípicas', '100 típicas de examen sabidas', tipicas >= 100),
    L('t1', '📝', 'Tests', 'Primer test', 'Haz tu primer test', n >= 1),
    L('t5', '📝', 'Tests', 'Calentando', '5 tests hechos', n >= 5),
    L('t10', '📚', 'Tests', 'Diez tests', '10 tests hechos', n >= 10),
    L('t25', '🏋️', 'Tests', 'Entrenamiento serio', '25 tests hechos', n >= 25),
    L('t50', '🏆', 'Tests', 'Máquina de tests', '50 tests hechos', n >= 50),
    L('n5', '✅', 'Tests', 'Aprobado', 'Saca un 5 o más', best >= 5),
    L('n7', '👍', 'Tests', 'Notable', 'Saca un 7 o más', best >= 7),
    L('n9', '🎓', 'Tests', 'Sobresaliente', 'Saca un 9 o más', best >= 9),
    L('n10', '💎', 'Tests', 'Perfecto', 'Saca un 10', best >= 10),
    L('s3', '📈', 'Tests', 'En racha', '3 tests seguidos con 7 o más', seguidos >= 3),
    L('sim1', '⏱️', 'Tests', 'Simulacro', 'Termina un simulacro', sims >= 1),
    L('sim5', '🎯', 'Tests', 'Lista para el examen', '5 simulacros terminados', sims >= 5),
    L('err0', '🧹', 'Tests', 'Sin errores pendientes', 'Deja «Mis errores» a cero tras 5 tests', errCero),
    L('r3', '🔥', 'Constancia', 'Constancia', 'Racha de 3 días', r >= 3),
    L('r7', '🔥', 'Constancia', 'Semana perfecta', 'Racha de 7 días', r >= 7),
    L('r14', '🔥', 'Constancia', 'Dos semanas', 'Racha de 14 días', r >= 14),
    L('r30', '🌋', 'Constancia', 'Imparable', 'Racha de 30 días', r >= 30),
    L('r60', '☄️', 'Constancia', 'Disciplina de hierro', 'Racha de 60 días', r >= 60),
    L('r100', '👑', 'Constancia', 'Leyenda', 'Racha de 100 días', r >= 100),
    L('d10', '📅', 'Constancia', '10 días', 'Estudia 10 días distintos', dias >= 10),
    L('d50', '📅', 'Constancia', '50 días', 'Estudia 50 días distintos', dias >= 50),
    L('d100', '🗓️', 'Constancia', '100 días', 'Estudia 100 días distintos', dias >= 100),
    L('e1', '📗', 'Temario', 'Primer tema', 'Marca un tema como estudiado', est >= 1),
    L('e5', '📘', 'Temario', 'Cinco temas', '5 temas estudiados', est >= 5),
    L('e10', '📙', 'Temario', 'Diez temas', '10 temas estudiados', est >= 10),
    L('e20', '📕', 'Temario', 'Más de la mitad', '20 temas estudiados', est >= 20),
    L('e34', '🎉', 'Temario', 'Temario completo', 'Los 34 temas estudiados', est >= 34),
    L('bI', '🏛️', 'Temario', 'Bloque I', 'Todo el Bloque I estudiado', blq('I')),
    L('bII', '💻', 'Temario', 'Bloque II', 'Todo el Bloque II estudiado', blq('II')),
    L('bIII', '🧩', 'Temario', 'Bloque III', 'Todo el Bloque III estudiado', blq('III')),
    L('bIV', '🌐', 'Temario', 'Bloque IV', 'Todo el Bloque IV estudiado', blq('IV')),
    L('hor', '🗓️', 'Organización', 'Organizada', 'Crea tu horario semanal', hayHorario()),
    L('pl10', '☑️', 'Organización', 'Cumplidora', 'Marca 10 tareas del planning', tareas >= 10),
    L('pl50', '✔️', 'Organización', 'Plan en marcha', 'Marca 50 tareas del planning', tareas >= 50),
    L('ins', '🖊️', 'Organización', 'Inscrita', 'Marca que ya te has inscrito', (S.config || {}).inscrita),
    L('vf15', '⚡', 'Juegos', 'Velocista', '15 aciertos en Verdadero o falso', (rec.vf || 0) >= 15),
    L('vf25', '⚡', 'Juegos', 'Rayo', '25 aciertos en Verdadero o falso', (rec.vf || 0) >= 25),
    L(
      'pm1',
      '🍅',
      'Constancia',
      'Primer pomodoro',
      'Termina un pomodoro',
      Object.values(S.diario || {}).some((d) => (d._s || {}).m > 0),
    ),
    L('st3', '⭐', 'Constancia', 'Retadora', 'Consigue 3 estrellas', estrellas() >= 3),
    L('duel', '🥚', 'Juegos', 'Ganadora', 'Gana un duelo a tu mascota', (rec.duelw || 0) >= 1),
    L(
      'sur20',
      '❤️',
      'Juegos',
      'Superviviente',
      'Aguanta 20 preguntas en Supervivencia',
      (rec.sur || 0) >= 20,
    ),
    L('emp', '🧩', 'Juegos', 'Emparejadora', 'Completa Empareja en menos de 60 s', rec.emp && rec.emp < 60),
  ];
}
function checkLogros() {
  if (!S.user || !S.ready) return;
  const ok = logros()
    .filter((x) => x.ok)
    .map((x) => x.id);
  const vistos = (S.rec || {}).logros;
  if (!Array.isArray(vistos)) {
    S.rec = Object.assign({}, S.rec, { logros: ok });
    kvSet('records');
    return;
  }
  const nuevos = ok.filter((id) => !vistos.includes(id));
  if (!nuevos.length) return;
  S.rec = Object.assign({}, S.rec, { logros: vistos.concat(nuevos) });
  kvSet('records');
  const l = logros().find((x) => x.id === nuevos[0]);
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.innerHTML = `<span>${esc(l.ic)}</span><div><small>¡Nuevo logro!</small><b>${esc(l.nom)}</b>${nuevos.length > 1 ? `<small>y ${nuevos.length - 1} más</small>` : ''}</div>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4500);
}

/* ---------- mascota, meta diaria y escudos ---------- */
const ETAPAS = [
  { d: 0, n: 'Huevo nuevo' },
  { d: 1, n: 'Huevo' },
  { d: 3, n: 'Huevo con grietas' },
  { d: 7, n: 'Pollito' },
  { d: 14, n: 'Polluelo' },
  { d: 30, n: 'Pájaro' },
  { d: 60, n: 'Pájaro sabio' },
  { d: 100, n: 'Fénix' },
];
const ACCS = [
  { a: 10, id: 'gafas', n: 'Gafas de empollona' },
  { a: 25, id: 'birrete', n: 'Birrete' },
  { a: 50, id: 'corona', n: 'Corona' },
];
const metaDia = () => {
  const m = +(S.config || {}).meta;
  return [10, 20, 40].includes(m) ? m : 20;
};
const mascName = () => ((S.config || {}).masc || 'Pipo').slice(0, 16);
const dayOk = (d) => !!((S.rec || {}).ok || {})[d] || ((S.act || {})[d] || 0) >= metaDia();
function R() {
  const act = S.act || {},
    ok = (S.rec || {}).ok || {};
  const ks = Object.keys(act).concat(Object.keys(ok)).sort();
  const t = today();
  const pts = act[t] || 0;
  if (!ks.length) return { n: 0, esc: 0, hoy: false, pts, meta: metaDia(), salvados: 0, descanso: false };
  let n = 0,
    esc = 0,
    salv = 0;
  const d = new Date(ks[0] + 'T12:00:00');
  const rest = new Set((S.config || {}).descanso || []);
  const isRest = (x) => rest.has((x.getDay() + 6) % 7);
  while (dkey(d) < t) {
    if (!dayOk(dkey(d)) && isRest(d)) {
      d.setDate(d.getDate() + 1);
      continue;
    }
    if (dayOk(dkey(d))) {
      n++;
      if (n % 7 === 0) esc = Math.min(2, esc + 1);
    } else if (n > 0 && esc > 0) {
      esc--;
      salv++;
    } else n = 0;
    d.setDate(d.getDate() + 1);
  }
  const hoy = dayOk(t);
  if (hoy) {
    n++;
    if (n % 7 === 0) esc = Math.min(2, esc + 1);
  }
  return { n, esc, hoy, pts, meta: metaDia(), salvados: salv, descanso: !hoy && isRest(new Date()) };
}
function racha() {
  return R().n;
}
const etapa = (n) => {
  let i = 0;
  ETAPAS.forEach((e, k) => {
    if (n >= e.d) i = k;
  });
  return i;
};
const accDe = (m) => {
  let r = null;
  ACCS.forEach((x) => {
    if (m >= x.a) r = x;
  });
  return r;
};
function mascSVG(st, acc, mood, size, label, prem) {
  prem = prem || (typeof premiosDe === 'function' && S.user ? premiosDe() : []);
  const egg = st <= 2,
    chick = st === 3 || st === 4,
    bird = st >= 5;
  const C = ['#fff4dc', '#fff4dc', '#fff4dc', '#ffd43b', '#ffcc29', '#8b5cf6', '#0d9488', '#f97316'][st];
  const ey = egg ? 112 : chick ? 100 : 96,
    top = egg ? 44 : chick ? 54 : 52;
  let g = '';
  if (st === 7)
    g += `<path d="M70 150 Q40 175 30 130 Q50 150 60 120 Q40 120 45 95 Q60 120 72 118Z" fill="#ef4444"/><path d="M130 150 Q160 175 170 130 Q150 150 140 120 Q160 120 155 95 Q140 120 128 118Z" fill="#ef4444"/><path d="M85 52 Q90 20 100 38 Q108 14 115 52Z" fill="#fbbf24"/>`;
  if (egg) {
    g += `<ellipse cx="100" cy="112" rx="56" ry="70" fill="${C}" stroke="#e8d3a8" stroke-width="3"/><circle cx="72" cy="80" r="7" fill="#f6cf8f"/><circle cx="128" cy="150" r="9" fill="#f6cf8f"/><circle cx="135" cy="88" r="5" fill="#f6cf8f"/>`;
    if (st === 2)
      g += `<path d="M58 125 L72 115 L82 128 L95 114 L106 127 L118 113 L130 126 L143 116" fill="none" stroke="#b08a4e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (chick) {
    g += `<ellipse cx="100" cy="${st === 3 ? 104 : 110}" rx="${st === 3 ? 52 : 58}" ry="${st === 3 ? 52 : 60}" fill="${C}"/><path d="M95 52 Q100 34 104 52 Q112 40 110 56" fill="none" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>`;
    if (st === 3)
      g += `<path d="M42 130 L56 118 L68 132 L82 117 L96 131 L110 117 L124 132 L138 118 L152 130 L158 130 Q156 182 100 182 Q44 182 42 130Z" fill="#fff4dc" stroke="#e8d3a8" stroke-width="3"/>`;
    else
      g += `<ellipse cx="48" cy="118" rx="12" ry="22" fill="#f5b800" transform="rotate(20 48 118)"/><ellipse cx="152" cy="118" rx="12" ry="22" fill="#f5b800" transform="rotate(-20 152 118)"/><path d="M84 168 v12 M78 180 h12 M116 168 v12 M110 180 h12" stroke="#f97316" stroke-width="4" stroke-linecap="round"/>`;
  }
  if (bird) {
    const L = st === 5 ? '#c4b5fd' : st === 6 ? '#99f6e4' : '#fed7aa';
    g += `<path d="M100 150 Q70 190 60 175 Q78 168 84 150Z" fill="${C}"/><ellipse cx="100" cy="108" rx="56" ry="58" fill="${C}"/><ellipse cx="100" cy="128" rx="34" ry="32" fill="${L}"/><ellipse cx="46" cy="112" rx="13" ry="28" fill="${C}" stroke="rgb(0 0 0 / .12)" stroke-width="2" transform="rotate(18 46 112)"/><ellipse cx="154" cy="112" rx="13" ry="28" fill="${C}" stroke="rgb(0 0 0 / .12)" stroke-width="2" transform="rotate(-18 154 112)"/><path d="M84 166 v10 M116 166 v10" stroke="#f97316" stroke-width="4" stroke-linecap="round"/>`;
    if (st === 6) g += `<path d="M92 52 Q86 30 98 40 Q100 24 106 42 Q116 30 110 54Z" fill="#0f766e"/>`;
  }
  if (mood === 'sleep')
    g += `<path d="M78 ${ey} q7 6 14 0 M108 ${ey} q7 6 14 0" fill="none" stroke="#1d1a26" stroke-width="3.5" stroke-linecap="round"/><text x="140" y="${top + 6}" font-size="18" font-weight="900" fill="#8b5cf6">z</text><text x="152" y="${top - 8}" font-size="13" font-weight="900" fill="#8b5cf6">z</text>`;
  else
    g += `<circle cx="85" cy="${ey}" r="7" fill="#1d1a26"/><circle cx="115" cy="${ey}" r="7" fill="#1d1a26"/><circle cx="87.5" cy="${ey - 2.5}" r="2.4" fill="#fff"/><circle cx="117.5" cy="${ey - 2.5}" r="2.4" fill="#fff"/>`;
  if (!egg) g += `<path d="M93 ${ey + 9} L107 ${ey + 9} L100 ${ey + 19}Z" fill="#f97316"/>`;
  else if (mood === 'happy')
    g += `<path d="M90 ${ey + 14} q10 10 20 0" fill="none" stroke="#1d1a26" stroke-width="3.5" stroke-linecap="round"/>`;
  else if (mood !== 'sleep') g += `<ellipse cx="100" cy="${ey + 17}" rx="4" ry="5" fill="#1d1a26"/>`;
  if (mood === 'happy')
    g += `<ellipse cx="72" cy="${ey + 12}" rx="8" ry="5" fill="#fb7185" opacity=".55"/><ellipse cx="128" cy="${ey + 12}" rx="8" ry="5" fill="#fb7185" opacity=".55"/><path d="M40 60 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4Z" fill="#fbbf24"/><path d="M160 40 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3Z" fill="#fbbf24"/>`;
  if (acc && mood !== 'sleep' && (acc.id === 'gafas' || acc.id === 'birrete' || acc.id === 'corona'))
    g += `<circle cx="85" cy="${ey}" r="12" fill="none" stroke="#1d1a26" stroke-width="3"/><circle cx="115" cy="${ey}" r="12" fill="none" stroke="#1d1a26" stroke-width="3"/><path d="M97 ${ey} h6" stroke="#1d1a26" stroke-width="3"/>`;
  if (acc && acc.id === 'birrete')
    g += `<path d="M60 ${top + 2} L100 ${top - 16} L140 ${top + 2} L100 ${top + 20}Z" fill="#1d1a26"/><rect x="82" y="${top + 6}" width="36" height="12" fill="#1d1a26"/><path d="M134 ${top + 3} v18" stroke="#fbbf24" stroke-width="3"/><circle cx="134" cy="${top + 23}" r="4" fill="#fbbf24"/>`;
  if (acc && acc.id === 'corona')
    g += `<path d="M72 ${top + 8} L76 ${top - 18} L90 ${top - 2} L100 ${top - 24} L110 ${top - 2} L124 ${top - 18} L128 ${top + 8}Z" fill="#fbbf24" stroke="#d97706" stroke-width="2"/><circle cx="100" cy="${top - 4}" r="4" fill="#ef4444"/>`;
  let pre = '';
  if (prem.includes('aura'))
    pre += `<circle cx="100" cy="108" r="88" fill="none" stroke="#fbbf24" stroke-width="6" opacity=".55"/><circle cx="100" cy="108" r="80" fill="#fde68a" opacity=".25"/>`;
  if (prem.includes('capa'))
    pre += `<path d="M52 110 Q30 175 70 186 L130 186 Q170 175 148 110Z" fill="#7c3aed" opacity=".9"/>`;
  if (prem.includes('bufanda'))
    g += `<path d="M60 ${ey + 28} Q100 ${ey + 44} 140 ${ey + 28} L140 ${ey + 40} Q100 ${ey + 56} 60 ${ey + 40}Z" fill="#ef4444"/><path d="M118 ${ey + 44} l8 30 l12 -4 l-6 -28Z" fill="#dc2626"/>`;
  return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="${esc(label)}">${pre}${g}</svg>`;
}
function frase(r) {
  const h = [...today()].reduce((a, c) => a + c.charCodeAt(0), 0);
  const pick = (a) =>
    a[h % a.length]
      .replace('{meta}', r.meta)
      .replace('{pts}', r.pts)
      .replace('{left}', Math.max(0, r.meta - r.pts));
  if (r.descanso && !r.pts)
    return pick([
      'Hoy es tu día de descanso 😴 La racha no se rompe.',
      'Descansar también es estudiar. ¡Mañana seguimos!',
    ]);
  if (r.hoy)
    return pick([
      '¡Llena! Hoy ya has cumplido 💜',
      'Racha a salvo. Ahora, si quieres, descansa un poco',
      '¡Qué orgullosa estoy de ti! Mañana más',
      'Hoy me has cuidado genial. ¡Gracias!',
    ]);
  if (r.pts > 0)
    return pick([
      '¡Ñam! Llevamos {pts} de {meta}. ¡Un poquito más!',
      'Ya casi… me quedan {left} bocados',
      'Me estoy poniendo fuerte, ¡sigue así!',
    ]);
  if (!r.n)
    return pick([
      'Zzz… despiértame con unas tarjetitas',
      'Empezamos de cero, ¡pero juntas!',
      'Un poquito hoy y me pongo a crecer 🥚',
    ]);
  return pick([
    '¿Hoy me das de comer? Me apetecen {meta} tarjetitas 🃏',
    'Psst… que estoy aquí. ¿Unas preguntas?',
    'Tengo hambre de temario 😋',
    'Si estudias un poquito hoy, sigo creciendo 🌱',
  ]);
}
function vMascota() {
  const r = R(),
    st = etapa(r.n),
    ac = accDe((S.rec || {}).acMax || 0),
    mood = r.hoy ? 'happy' : !r.n && !r.pts ? 'sleep' : 'wait';
  const sig = ETAPAS[st + 1],
    pct = Math.min(100, Math.round((r.pts / r.meta) * 100)),
    nm = mascName();
  return `<div class="card mascard"><div class="masc">${mascSVG(st, ac, mood, 150, nm + ', tu mascota: ' + ETAPAS[st].n + (ac ? ' con ' + ac.n.toLowerCase() : ''))}</div>
  <div class="mtx"><div class="mhead"><b>${esc(nm)}</b><span class="mst">${esc(ETAPAS[st].n)}</span>${ui.pomo ? '' : '<button class="mini hi" data-act="pomo">🍅 Pomodoro</button>'}<button class="mini ghost" data-act="mascCfg" aria-expanded="${ui.mcfg ? 'true' : 'false'}">Ajustes</button></div>
  <p class="bubble">${esc(frase(r))}</p>
  <div class="meta"><div class="mbar" role="progressbar" aria-label="Meta de hoy" aria-valuemin="0" aria-valuemax="${r.meta}" aria-valuenow="${Math.min(r.pts, r.meta)}"><i style="width:${pct}%"></i></div><span>${Math.min(r.pts, r.meta)} / ${r.meta} puntos hoy${r.hoy ? ' ✓' : ''}</span></div>
  <p class="ptsinfo">1 punto por cada <b>tarjeta clasificada</b> o <b>pregunta respondida</b> · 2 por cada <b>tarea de «Hoy toca»</b> · 5 por cada <b>pomodoro</b></p>
  <div class="mstats"><span title="Días seguidos cumpliendo la meta">🔥 <b>${r.n}</b> ${r.n === 1 ? 'día' : 'días'}</span><span title="Cada escudo salva un día que no estudies">🛡️ <b>${r.esc}</b>/2 escudos</span>${r.descanso ? '<span>😴 Hoy descansas</span>' : ''}</div>
  ${sig ? `<p class="fine">${sig.d - r.n === 1 ? 'Mañana' : `En ${sig.d - r.n} días`} se convierte en <b>${esc(sig.n.toLowerCase())}</b>.</p>` : '<p class="fine">¡Ha llegado a su forma final!</p>'}
  ${
    ui.mcfg
      ? `<form class="mcfg" data-mcfg="1"><div class="fld"><label for="mname">Nombre de tu mascota</label><input id="mname" name="n" maxlength="16" value="${esc(nm)}" autocomplete="off"></div>
  <div class="fld" role="radiogroup" aria-labelledby="mmeta"><span id="mmeta" class="lbl">Meta diaria (puntos al día)</span><div class="seg">${[
    [10, 'Suave', '≈10 min'],
    [20, 'Normal', '≈20 min'],
    [40, 'Intensa', '≈40 min'],
  ]
    .map(
      ([m, t, d]) =>
        `<label><input type="radio" name="m" value="${m}"${m === r.meta ? ' checked' : ''}><span><b>${m}</b><small>${t}</small><small>${d}</small></span></label>`,
    )
    .join('')}</div></div>
  <div class="fld" role="group" aria-labelledby="mdesc"><span id="mdesc" class="lbl">Días de descanso (no rompen la racha)</span><div class="days">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, k) => `<label><input type="checkbox" name="dd" value="${k}"${((S.config || {}).descanso || []).includes(k) ? ' checked' : ''}><span aria-label="${DIAS[k]}">${d}</span></label>`).join('')}</div></div>
  <p class="fine">Cada tarjeta que clasificas o pregunta que respondes es 1 punto. Cada 7 días de racha ganas un escudo 🛡️ (máximo 2) que te salva un día que no puedas estudiar.</p>
  <div class="acts"><button class="btn">Guardar</button><button type="button" class="btn ghost" data-act="mascCfg">Cancelar</button></div></form>`
      : ''
  }
  </div></div>`;
}
function vEvolucion() {
  const r = R(),
    st = etapa(r.n),
    mx = Math.max(st, (S.rec || {}).stMax || 0),
    am = (S.rec || {}).acMax || 0;
  const it = (svg, nom, sub, on, cur) =>
    `<li class="${on ? 'on' : 'off'}${cur ? ' cur' : ''}">${svg}<b>${esc(nom)}</b><small>${esc(sub)}</small>${cur ? '<span class="ya">Ahora</span>' : on ? '' : '<span class="lock" aria-hidden="true">🔒</span>'}</li>`;
  return `<div class="card evocard"><h3>Evolución de ${esc(mascName())}</h3><p class="sub">Crece con tu racha de días. Desliza para ver todas las formas →</p>
  <ul class="evo" aria-label="Formas de la mascota">${ETAPAS.map((e, k) => it(mascSVG(k, null, k <= mx ? 'happy' : 'wait', 76, e.n + (k <= mx ? '' : ' (bloqueado)')), e.n, e.d ? e.d + (e.d === 1 ? ' día' : ' días') : 'Al empezar', k <= mx, k === st)).join('')}</ul>
  <h4 class="evo-h">Accesorios <small>· se ganan con aciertos seguidos en los tests (tu récord: ${am})</small></h4>
  <h4 class="evo-h">Premios de los retos <small>· estrellas: ${estrellas()}</small></h4><ul class="evo" aria-label="Premios">${PREMIOS.map((p) => it(mascSVG(4, null, 'happy', 76, p.n, [p.id]), p.n, p.s + ' estrellas', estrellas() >= p.s, false)).join('')}</ul>
  <ul class="evo" aria-label="Accesorios">${ACCS.map((a) => it(mascSVG(4, a, 'happy', 76, a.n + (am >= a.a ? '' : ' (bloqueado)')), a.n, a.a + ' aciertos seguidos', am >= a.a, false)).join('')}</ul></div>`;
}
function celebrar() {
  if (!S.user || !S.ready || document.querySelector('.modal')) return;
  const r = R(),
    st = etapa(r.n),
    rec = S.rec || {};
  const am = rec.acMax || 0,
    ac = accDe(am);
  let msg = null;
  if (rec.stMax == null) {
    S.rec = Object.assign({}, rec, { stMax: st, acSeen: ac ? ac.id : null });
    kvSet('records');
    return;
  }
  if (st > rec.stMax) {
    msg = {
      t: st === 7 ? '¡Renace como fénix!' : st === 3 ? '¡Ha eclosionado!' : '¡' + mascName() + ' ha crecido!',
      d: `Ahora es ${ETAPAS[st].n.toLowerCase()}. Llevas ${r.n} días seguidos.`,
      svg: mascSVG(st, ac, 'happy', 160, ETAPAS[st].n),
    };
    S.rec = Object.assign({}, rec, { stMax: st });
  } else if (
    ac &&
    ac.id !== rec.acSeen &&
    (!rec.acSeen || ACCS.findIndex((x) => x.id === ac.id) > ACCS.findIndex((x) => x.id === rec.acSeen))
  ) {
    msg = {
      t: '¡Nuevo accesorio!',
      d: `${ac.n}: por ${ac.a} aciertos seguidos en los tests.`,
      svg: mascSVG(st, ac, 'happy', 160, ac.n),
    };
    S.rec = Object.assign({}, rec, { acSeen: ac.id });
  }
  if (!msg) return;
  kvSet('records');
  const prev = document.activeElement;
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="mbox" role="dialog" aria-modal="true" aria-labelledby="mt">${msg.svg}<h2 id="mt">${esc(msg.t)}</h2><p>${esc(msg.d)}</p><button class="btn big2" data-close="1">¡Genial!</button></div>`;
  const close = () => {
    m.remove();
    prev && prev.focus && prev.focus();
  };
  m.addEventListener('click', (e) => {
    if (e.target === m || e.target.closest('[data-close]')) close();
  });
  m.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      if (e.key === 'Escape') close();
    }
  });
  document.body.appendChild(m);
  m.querySelector('button').focus();
}

/* ---------- retos semanales ---------- */
function semKey(d) {
  const x = new Date(d || new Date());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return dkey(x);
}
function retos() {
  const lun = semKey(),
    dias = [0, 1, 2, 3, 4, 5, 6].map((k) => dkey(addD(new Date(lun + 'T12:00:00'), k)));
  const st = dias.map((d) => ((S.diario || {})[d] || {})._s || {});
  const sum = (k) => st.reduce((a, s) => a + (s[k] || 0), 0);
  const tests = S.res.filter((r) => (r.fecha || '').slice(0, 10) >= lun).length;
  const metas = dias.filter((d) => d <= today() && dayOk(d)).length;
  const R = [
    { id: 'cards', t: 'Clasifica 150 tarjetas', v: sum('c'), m: 150, ic: '🃏' },
    { id: 'tests', t: 'Haz 3 tests o exámenes', v: tests, m: 3, ic: '📝' },
    { id: 'metas', t: 'Cumple la meta 5 días', v: metas, m: 5, ic: '🎯' },
    { id: 'pomo', t: 'Haz 8 pomodoros', v: sum('m'), m: 8, ic: '🍅' },
  ];
  return { lun, R };
}
const PREMIOS = [
  { s: 3, id: 'bufanda', n: 'Bufanda' },
  { s: 8, id: 'capa', n: 'Capa de heroína' },
  { s: 15, id: 'aura', n: 'Aura dorada' },
];
function estrellas() {
  const h = (S.rec || {}).retos || {};
  return Object.values(h).reduce((a, x) => a + x.length, 0);
}
function checkRetos() {
  if (!S.user || !S.ready) return;
  const { lun, R } = retos();
  const h = Object.assign({}, (S.rec || {}).retos || {});
  const ya = h[lun] || [];
  const nuevos = R.filter((r) => r.v >= r.m && !ya.includes(r.id));
  if (!nuevos.length) return;
  h[lun] = ya.concat(nuevos.map((r) => r.id));
  S.rec = Object.assign({}, S.rec, { retos: h });
  kvSet('records');
  toast('⭐', '¡Reto cumplido!', nuevos[0].t + ' · +1 estrella');
}
function premiosDe() {
  const e = estrellas();
  return PREMIOS.filter((p) => e >= p.s).map((p) => p.id);
}
function vRetos() {
  const { R } = retos();
  const e = estrellas(),
    sig = PREMIOS.find((p) => e < p.s);
  return `<div class="card retos"><h3>Retos de la semana <small>⭐ ${e} estrellas</small></h3><div class="rlist2">${R.map((r) => `<div class="reto${r.v >= r.m ? ' ok' : ''}"><span class="ri" aria-hidden="true">${r.v >= r.m ? '⭐' : r.ic}</span><div><b>${esc(r.t)}</b><div class="tr" role="progressbar" aria-label="${esc(r.t)}" aria-valuemin="0" aria-valuemax="${r.m}" aria-valuenow="${Math.min(r.v, r.m)}"><i style="width:${Math.min(100, (r.v / r.m) * 100)}%"></i></div><small>${Math.min(r.v, r.m)} / ${r.m}</small></div></div>`).join('')}</div>${sig ? `<p class="fine">Con ${sig.s} estrellas ${esc(mascName())} consigue: <b>${esc(sig.n.toLowerCase())}</b>.</p>` : '<p class="fine">¡Tienes todos los premios!</p>'}</div>`;
}
