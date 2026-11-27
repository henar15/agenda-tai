/**
 * Utilidades, estado global (S y ui), guardado local y en Firestore, banco de preguntas.
 */
const $ = (s) => document.querySelector(s);
const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const rich = (v) => esc(v).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const plain = (v) => String(v ?? '').replace(/\*\*/g, '');
const BL = {
  I: {
    c: 'var(--b1)',
    hex: '#7c3aed',
    l: '#ede9fe',
    n: 'Organización del Estado y Administración electrónica',
  },
  II: { c: 'var(--b2)', hex: '#0d9488', l: '#ccfbf1', n: 'Tecnología básica' },
  III: { c: 'var(--b3)', hex: '#2563eb', l: '#dbeafe', n: 'Desarrollo de sistemas' },
  IV: { c: 'var(--b4)', hex: '#ea580c', l: '#ffedd5', n: 'Sistemas y comunicaciones' },
};
const EST = ['pendiente', 'en-curso', 'estudiado'],
  ESTN = { pendiente: 'Pendiente', 'en-curso': 'En curso', estudiado: 'Estudiado' };
const S = {
  nivel: {},
  mem: {},
  esq: {},
  stats: {},
  exIdx: [],
  exams: {},
  horario: { dias: [] },
  act: {},
  pedidos: {},
  user: null,
  authReady: false,
  plan: {},
  planHecho: {},
  temasBase: [],
  temas: [],
  cards: {},
  piles: {},
  estados: {},
  tests: [],
  preg: {},
  res: [],
  config: {},
  err: {},
  rec: {},
  ready: false,
};
const ui = {
  pomo: null,
  xtab: 'web',
  ex: null,
  xcfg: null,
  hdia: null,
  hedit: false,
  mazo: '',
  filtro: 'todas',
  idx: 0,
  flip: false,
  test: null,
  scope: '',
  game: null,
};

const fmtD = (d) => {
  if (!d) return '';
  const x = new Date(d + 'T12:00:00');
  return x.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};
const monday = () => {
  const d = new Date();
  const w = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - w);
  return d.toISOString().slice(0, 10);
};
const nota = (r) => {
  const t = r.total || 1;
  return (Math.max(0, r.aciertos - (r.fallos || 0) / 3) / t) * 10;
};
const n1 = (v) => v.toFixed(1).replace('.', ',');
const shuffle = (a) => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const hash = (s) => {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.codePointAt(0)) | 0;
  return 'q' + (h >>> 0).toString(36);
};
let LS = 'agendaTAI:anon:';
const lsGet = (k) => {
  try {
    return JSON.parse(localStorage.getItem(LS + k));
  } catch (e) {
    return null;
  }
};
const lsSet = (k, v) => {
  try {
    localStorage.setItem(LS + k, JSON.stringify(v));
  } catch (e) {}
};
const KEYS = [
  'estados',
  'piles',
  'resultados',
  'errores',
  'config',
  'records',
  'planHecho',
  'actividad',
  'horario',
  'recursos',
  'lectura',
  'diario',
  'srs',
  'claves',
  'stats',
  'nivel',
  'mem',
];
let fs = null,
  uid = null,
  auth = null;
function kvVal(k) {
  return {
    stats: S.stats,
    nivel: S.nivel,
    mem: S.mem,
    claves: S.claves,
    srs: S.srs,
    lectura: S.lectura,
    diario: S.diario,
    recursos: S.recursos,
    horario: S.horario,
    actividad: S.act,
    estados: S.estados,
    piles: S.piles,
    resultados: { items: S.res },
    errores: S.err,
    config: S.config,
    records: S.rec,
    planHecho: S.planHecho,
  }[k];
}
function applyKV(k, v) {
  if (v == null) return;
  if (k === 'estados') S.estados = v;
  else if (k === 'piles') S.piles = v;
  else if (k === 'resultados') S.res = v.items || [];
  else if (k === 'errores') S.err = v;
  else if (k === 'config') S.config = v;
  else if (k === 'records') S.rec = v;
  else if (k === 'planHecho') S.planHecho = v;
  else if (k === 'actividad') S.act = v;
  else if (k === 'horario') S.horario = v;
  else if (k === 'recursos') S.recursos = v;
  else if (k === 'lectura') S.lectura = v;
  else if (k === 'diario') S.diario = v;
  else if (k === 'srs') S.srs = v;
  else if (k === 'claves') {
    S.claves = v;
    loadGrupo();
  } else if (k === 'stats') S.stats = v;
  else if (k === 'nivel') S.nivel = v;
  else if (k === 'mem') S.mem = v;
}
/* ---------- sincronización entre dispositivos (móvil y ordenador) ----------
 * Antes de leer la nube no se sube nada (así un dispositivo con datos viejos no pisa los buenos).
 * Al leer, lo de la nube se MEZCLA con lo de este dispositivo en vez de sustituirlo. */
const kvPend = new Set();
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
function mergeMax(a, b) {
  const o = Object.assign({}, a);
  Object.entries(b || {}).forEach(
    ([k, v]) => (o[k] = typeof v === 'number' ? Math.max(v, o[k] || 0) : o[k] != null ? o[k] : v),
  );
  return o;
}
function mergeKV(k, loc, rem) {
  if (loc == null) return rem;
  if (rem == null) return loc;
  if (k === 'diario') {
    const o = Object.assign({}, rem);
    Object.entries(loc).forEach(([d, L]) => {
      const R = o[d] || {};
      const m = Object.assign({}, R, L);
      m._s = mergeMax(R._s, L._s);
      if (R._plan && L._plan)
        m._plan = (R._plan.tareas || []).length >= (L._plan.tareas || []).length ? R._plan : L._plan;
      o[d] = m;
    });
    return o;
  }
  if (k === 'mem') {
    const items = Object.assign({}, rem.items);
    Object.entries(loc.items || {}).forEach(([id, it]) => {
      const r = items[id];
      if (!r || (it.r || 0) > (r.r || 0) || ((it.r || 0) === (r.r || 0) && (it.l || 0) > (r.l || 0)))
        items[id] = it;
    });
    const cal = Object.assign({}, rem.cal);
    Object.entries(loc.cal || {}).forEach(([c, v]) => {
      if (!cal[c] || v[1] > cal[c][1]) cal[c] = v;
    });
    return Object.assign({}, rem, loc, { items, cal, seed: rem.seed || loc.seed });
  }
  if (k === 'actividad' || k === 'lectura') return mergeMax(rem, loc);
  if (k === 'resultados') {
    const seen = new Set(),
      items = [];
    (rem.items || []).concat(loc.items || []).forEach((r) => {
      const id = (r.fecha || '') + '|' + (r.testId || '') + '|' + (r.total || '');
      if (!seen.has(id)) {
        seen.add(id);
        items.push(r);
      }
    });
    items.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    return Object.assign({}, rem, { items });
  }
  if (k === 'records') {
    const o = Object.assign({}, rem, loc);
    Object.keys(rem).forEach((x) => {
      if (typeof rem[x] === 'number') o[x] = Math.max(rem[x], loc[x] || 0);
      else if (isObj(rem[x]) && isObj(loc[x])) o[x] = Object.assign({}, rem[x], loc[x]);
    });
    return o;
  }
  if (
    ['piles', 'srs', 'errores', 'stats', 'nivel', 'estados', 'planHecho'].includes(k) &&
    isObj(loc) &&
    isObj(rem)
  ) {
    const o = Object.assign({}, rem);
    Object.entries(loc).forEach(
      ([x, v]) => (o[x] = isObj(v) && isObj(rem[x]) ? Object.assign({}, rem[x], v) : v),
    );
    return o;
  }
  return rem; // config, horario, claves…: manda la nube
}
const kvT = {};
function kvSet(k) {
  const v = kvVal(k);
  lsSet(k, v);
  if (fs && uid && !S.remoteOk) {
    kvPend.add(k);
    return;
  }
  if (fs && uid) {
    clearTimeout(kvT[k]);
    kvT[k] = setTimeout(() => {
      fs.collection('users')
        .doc(uid)
        .collection('kv')
        .doc(k)
        .set({ v: JSON.stringify(v), t: Date.now() })
        .then(() => flash('Guardado en la nube'))
        .catch(() => flash('No se pudo guardar en la nube'));
    }, 500);
  } else flash('Guardado en este dispositivo');
}
function flash(t) {
  const e = $('#sync');
  if (e) e.textContent = t;
}
function resetUser() {
  ui.gscope = null;
  Object.assign(S, {
    stats: {},
    nivel: {},
    mem: {},
    grupo: null,
    claves: null,
    srs: {},
    lectura: {},
    diario: {},
    recursos: null,
    horario: { dias: [] },
    act: {},
    estados: {},
    piles: {},
    res: [],
    err: {},
    config: {},
    rec: {},
    planHecho: {},
  });
}
const temaName = (id) => {
  const t = S.temas.find((x) => x.id === id);
  return t ? t.codigo + ' ' + t.titulo : id;
};
const temaBl = (id) => {
  const t = S.temas.find((x) => x.id === id);
  return BL[(t && t.bloque) || 'I'];
};

/* banco de preguntas: preguntas/<tema> + tests fijos */
function bank(scope) {
  const out = [],
    seen = new Set();
  const add = (q, tema) => {
    if (!q || !q.opts || q.c == null) return;
    const id = q.id || hash(q.q);
    if (seen.has(id)) return;
    seen.add(id);
    out.push(Object.assign({}, q, { id, tema }));
  };
  Object.entries(S.preg).forEach(([tema, arr]) => {
    if (!scope || tema === scope) arr.forEach((q) => add(q, tema));
  });
  S.tests.forEach((t) => {
    if (!scope || t.tema === scope) (t.preguntas || []).forEach((q) => add(q, t.tema));
  });
  return out;
}
const temasConBanco = () => {
  const ids = new Set(bank().map((q) => q.tema));
  return S.temas.filter((t) => ids.has(t.id)).sort(ordT);
};
const temasConCartas = () => {
  const ids = new Set(Object.keys(S.cards).filter((k) => S.cards[k].length));
  return S.temas
    .filter((t) => ids.has(t.id))
    .sort(ordT)
    .map((t) => ({
      id: t.id,
      titulo: 'Tema ' + t.codigo + ' · ' + t.titulo + ' (' + temaCards(t.id).length + ')',
    }));
};
const ordT = (a, b) =>
  ['I', 'II', 'III', 'IV'].indexOf(a.bloque) - ['I', 'II', 'III', 'IV'].indexOf(b.bloque) ||
  a.orden - b.orden;
const errList = () => Object.entries(S.err.items || {}).map(([k, v]) => Object.assign({ id: k }, v));

// En móvil, las tablas .stack muestran la cabecera de cada celda como etiqueta
new MutationObserver(() => {
  for (const c of document.querySelectorAll('.stack td:not([data-l])')) {
    let i = 0,
      p = c;
    while ((p = p.previousElementSibling)) i += p.colSpan;
    c.dataset.l = c.closest('table').rows[0].cells[i]?.textContent || '';
  }
}).observe(document, { childList: true, subtree: true });
