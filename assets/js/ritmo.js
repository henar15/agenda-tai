/**
 * «A tu ritmo»: repaso adaptativo de conceptos (tarjetas y preguntas).
 *
 * En qué se basa:
 *  - Modelo de memoria tipo FSRS (estabilidad, dificultad y probabilidad de recordar):
 *    cada concepto vuelve justo cuando estás a punto de olvidarlo (~90 % de recuerdo).
 *  - Corrección automática: en las tarjetas se escribe la respuesta y se comprueban las ideas
 *    clave (lo que va en negrita). La seguridad se mide por la velocidad de respuesta, que no se
 *    puede fingir: acertar rápido cuenta más que acertar tras pensarlo mucho.
 *  - Efecto de hipercorrección: los errores que cometes respondiendo rápido (muy segura) se corrigen mejor si
 *    se destacan y se vuelven a preguntar pronto (en la misma sesión y al día siguiente).
 *  - Reaprendizaje sucesivo: en cada sesión, lo que fallas vuelve a salir unos minutos
 *    después hasta que lo aciertas.
 *  - Rescate: de vez en cuando vuelve algo que te costó aprender, para que no se pierda.
 *  - Mezcla de temas (práctica intercalada).
 */

const MEM_DIA = 864e5;
const MEM_OBJ = 0.9; // recuerdo deseado al repasar

// Probabilidad de recordar tras t días con estabilidad s (curva de olvido de FSRS)
const memR = (t, s) => Math.pow(1 + (19 / 81) * (t / s), -0.5);
const memItems = () => (S.mem && S.mem.items) || {};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/**
 * Actualiza el modelo de un concepto.
 * nota: 1 = fallo · 2 = acierto con duda · 3 = acierto · 4 = acierto seguro y fácil
 */
function memMark(id, tema, kind, nota, extra) {
  extra = extra || {};
  const items = Object.assign({}, memItems());
  const now = Date.now();
  const it = Object.assign({ s: 0, d: 5, r: 0, x: 0, hc: 0, t: tema, k: kind }, items[id]);
  if (!it.s) {
    it.s = [0, 0.4, 1.2, 3, 8][nota];
    it.d = clamp(5 + (3 - nota) * 1.2, 1, 10);
  } else {
    const dias = Math.max(0, (now - it.l) / MEM_DIA);
    const R = memR(dias, it.s);
    if (nota === 1) {
      it.s = clamp(it.s * 0.2 * Math.exp((1 - R) * 0.5), 0.2, it.s);
      it.x++;
    } else {
      const crece =
        1 +
        Math.exp(1.2) *
          (11 - it.d) *
          Math.pow(it.s, -0.2) *
          (Math.exp((1 - R) * 1.1) - 1) *
          (nota === 2 ? 0.45 : 1) *
          (nota === 4 ? 1.3 : 1);
      it.s = Math.max(it.s + 0.5, it.s * Math.max(1.1, crece));
    }
    it.d = clamp(it.d + (3 - nota) * 0.7 + (5 - it.d) * 0.05, 1, 10);
  }
  it.r++;
  it.l = now;
  // Intervalo para mantener el 90 % de recuerdo (con la curva de FSRS, coincide con s)
  let dias = it.s * (Math.pow(MEM_OBJ, -2) - 1) * (81 / 19);
  if (extra.hc) {
    it.hc++;
    dias = Math.min(dias, 1); // error con seguridad: vuelve mañana sí o sí
  }
  it.due = now + Math.max(0.5, dias) * MEM_DIA;
  if (it.x >= 2 || it.hc) it.cost = 1; // le costó: candidato a «rescate»
  items[id] = it;
  S.mem = Object.assign({}, S.mem, { items });
}

function memCalib(conf, ok) {
  const c = Object.assign({}, (S.mem || {}).cal);
  const v = (c[conf] || [0, 0]).slice();
  v[0] += ok ? 1 : 0;
  v[1]++;
  c[conf] = v;
  S.mem = Object.assign({}, S.mem, { cal: c });
}

// Busca un concepto (tarjeta o pregunta) por id
function memFind(id, kind, tema) {
  if (kind === 'c') return (S.cards[tema] || []).find((c) => c.id === id) || null;
  return poolAll().find((q) => q.id === id) || errList().find((q) => q.id === id) || null;
}

function memDue() {
  const now = Date.now();
  return Object.entries(memItems())
    .filter(([, it]) => it.due <= now)
    .map(([id, it]) => Object.assign({ id }, it));
}
const memDueCount = () => memDue().length;

// Arma una sesión: lo que toca, unas pocas nuevas, 1–2 rescates y todo mezclado
function memSesion(tam) {
  const now = Date.now();
  const due = memDue().sort((a, b) => memR((now - a.l) / MEM_DIA, a.s) - memR((now - b.l) / MEM_DIA, b.s));
  const cola = due.slice(0, tam).map((it) => ({ id: it.id, k: it.k, t: it.t }));
  const usados = new Set(cola.map((c) => c.id));
  // Rescate: algo que costó y ya está asentado, antes de que toque
  const rescate = Object.entries(memItems())
    .filter(([id, it]) => it.cost && !usados.has(id) && it.s >= 4 && now - it.l > 3 * MEM_DIA)
    .sort(() => Math.random() - 0.5)
    .slice(0, 2)
    .map(([id, it]) => ({ id, k: it.k, t: it.t, rescate: true }));
  // Nuevas: tarjetas de los temas que estás estudiando (o de cualquiera con tarjetas)
  const hueco = Math.max(0, Math.min(15, tam - cola.length - rescate.length));
  const temas = temasEnCurso(new Date())
    .map((t) => t.id)
    .concat(Object.keys(S.cards));
  const nuevas = [];
  for (const t of temas) {
    for (const c of temaCards(t)) {
      if (nuevas.length >= hueco) break;
      if (!memItems()[c.id] && !usados.has(c.id)) {
        nuevas.push({ id: c.id, k: 'c', t, nueva: true });
        usados.add(c.id);
      }
    }
    if (nuevas.length >= hueco) break;
  }
  const todo = shuffle(cola.concat(nuevas));
  rescate.forEach((r) => todo.splice(Math.floor(Math.random() * (todo.length + 1)), 0, r));
  return todo;
}

function startRitmo(tam) {
  const cola = memSesion(tam || 20).filter((x) => memFind(x.id, x.k, x.t));
  if (!cola.length) {
    flash('No hay nada que repasar ahora mismo 🎉');
    return;
  }
  ui.rit = { cola, i: 0, paso: 'q', ok: 0, n: 0, reint: {}, hc: 0, ini: cola.length };
  render();
}

/* ---------- corrección automática de lo que escribes ---------- */
const STOP = new Set(
  'el la los las un una unos unas de del al a y o u e en con por para que se su sus lo le les es son ser como mas más muy sin sobre entre cada este esta estos estas ese esa eso the of'.split(
    ' ',
  ),
);
const normTxt = (s) =>
  plain(String(s || ''))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ%/.,\s-]/g, ' ')
    .replace(/(\d)[.,](?=\d{3}\b)/g, '$1')
    .replace(/[.,]/g, ' ');
const NUMS = {
  cero: 0,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veinticinco: 25,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
  cien: 100,
  ciento: 100,
  mil: 1000,
  primero: 1,
  primera: 1,
  segundo: 2,
  segunda: 2,
  tercero: 3,
  tercera: 3,
  cuarto: 4,
  quinto: 5,
};
const ABREV = {
  rd: 'real decreto',
  rdl: 'real decreto ley',
  rdleg: 'real decreto legislativo',
  rdlg: 'real decreto legislativo',
  lo: 'ley organica',
  ce: 'constitucion',
  ccaa: 'comunidades autonomas',
  ca: 'comunidad autonoma',
  age: 'administracion general estado',
  aapp: 'administraciones publicas',
  tc: 'tribunal constitucional',
  ts: 'tribunal supremo',
  cgpj: 'consejo general poder judicial',
  art: 'articulo',
  arts: 'articulos',
  pdf: 'pdf',
  ue: 'union europea',
  bd: 'base datos',
  bbdd: 'bases datos',
  so: 'sistema operativo',
};
const toks = (s) =>
  normTxt(s)
    .replace(/%|por ciento|por cien/g, ' ')
    .split(/[\s/-]+/)
    .filter(Boolean)
    .flatMap((w) => (ABREV[w] ? ABREV[w].split(' ') : [NUMS[w] != null ? String(NUMS[w]) : w]));
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// ¿Aparece esta palabra (o algo muy parecido) en lo que escribiste?
function palabraEn(w, tus) {
  if (/^\d/.test(w)) return tus.includes(w);
  return tus.some(
    (t) =>
      t === w ||
      (w.length >= 5 &&
        t.length >= 5 &&
        (t.startsWith(w.slice(0, 5)) || w.startsWith(t.slice(0, 5))) &&
        lev(w, t) <= Math.ceil(w.length / 3)) ||
      (w.length >= 4 && lev(w, t) <= (w.length >= 9 ? 2 : 1)),
  );
}
// Las ideas clave son lo que va en **negrita** en la respuesta
function ideasClave(a) {
  const b = [...String(a).matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1]);
  return b.length ? b : [plain(a)];
}
function corregir(escrito, respuesta) {
  const tus = toks(escrito);
  const evalua = (k, umbral) => {
    const ws = toks(k);
    const sig = ws.filter((w) => !STOP.has(w) || ws.length === 1);
    const nums = sig.filter((w) => /^\d/.test(w));
    const hits = sig.filter((w) => palabraEn(w, tus)).length;
    return {
      k,
      ok: sig.length > 0 && nums.every((n) => tus.includes(n)) && hits / sig.length >= umbral,
      nums,
    };
  };
  const claves = ideasClave(respuesta).map((k) => Object.assign(evalua(k, 0.5), { w: 1 }));
  // Además de lo que va en negrita, cuenta el resto de la explicación (el «para qué»)
  const resto = plain(String(respuesta).replace(/\*\*(.+?)\*\*/g, ' '))
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s:,.;–-]+|[\s:,.;–-]+$/g, '')
    .trim();
  const restoSig = toks(resto).filter((w) => !STOP.has(w) && w.length >= 4);
  if (/\*\*/.test(respuesta) && restoSig.length >= 2)
    claves.push(Object.assign(evalua(resto, 0.5), { w: claves.length <= 1 ? 1 : 0.5, extra: true }));
  // Si pusiste un número distinto, te lo enseño («pusiste 135»)
  const tusNums = tus.filter((w) => /^\d/.test(w));
  const todos = new Set(claves.flatMap((c) => c.nums));
  const otros = tusNums.filter((n) => !todos.has(n));
  const malNum = claves.find((c) => !c.ok && c.nums.length);
  if (malNum && otros.length) malNum.tuyo = otros.join(', ');
  const tot = claves.reduce((a, c) => a + c.w, 0);
  const score = tot ? claves.filter((c) => c.ok).reduce((a, c) => a + c.w, 0) / tot : 0;
  return { score, claves: claves.map(({ k, ok, tuyo, extra }) => ({ k, ok, tuyo, extra })) };
}

/* ---------- velocidad: lo usamos como medida de seguridad (no se puede fingir) ---------- */
// En tarjetas se mide cuánto tardas en EMPEZAR a escribir (lo que tardas en recordar), no lo que
// tardas en teclear. Solo cuenta como «te ha costado» si tardas bastante más de lo normal en ti.
const tKey = (kind) => (kind === 'c' ? 'cl' : 'q');
function rapida(kind, ms) {
  const med = ((S.mem || {}).tmed || {})[tKey(kind)];
  const suelo = kind === 'c' ? 8000 : 12000;
  return ms <= Math.max(suelo, med ? med * 1.6 : 0);
}
function memTiempo(kind, ms) {
  const t = Object.assign({}, (S.mem || {}).tmed);
  const k = tKey(kind);
  t[k] = t[k] ? Math.round(t[k] * 0.85 + Math.min(ms, 60000) * 0.15) : Math.min(ms, 60000);
  S.mem = Object.assign({}, S.mem, { tmed: t });
}

// Calcula el resultado (aún sin guardar: se guarda al pulsar «Siguiente»)
function ritEvaluar(x, tipo, ms, extra) {
  const nueva = !!x.nueva;
  let r;
  if (tipo === 'nose') r = { ok: false, nota: 1, conf: 'azar', hc: false };
  else {
    const fast = rapida(x.k, ms);
    if (tipo === 'ok')
      r = { ok: true, nota: fast ? (nueva ? 3 : 4) : x.k === 'q' ? 2 : 3, conf: fast ? 'seg' : 'dudo' };
    else if (tipo === 'casi') r = { ok: true, parcial: true, nota: 2, conf: 'dudo' };
    else r = { ok: false, nota: 1, conf: fast ? 'seg' : 'dudo', hc: fast };
    memTiempo(x.k, ms);
  }
  ui.rit.pend = Object.assign(r, extra || {});
  ui.rit.last = ui.rit.pend;
  ui.rit.paso = 'fb';
}

function ritCommit() {
  const R = ui.rit,
    x = R.cola[R.i],
    r = R.pend;
  if (!r) return;
  if (!R.reint[x.id]) {
    memMark(x.id, x.t, x.k, r.nota, { hc: r.hc });
    memCalib(r.conf, r.ok);
    statTema(x.t, r.ok);
    if (x.k === 'c') {
      const piles = Object.assign({}, S.piles[x.t] || {});
      piles[x.id] = !r.ok ? 1 : r.nota >= 3 ? 3 : 2;
      S.piles = Object.assign({}, S.piles, { [x.t]: piles });
    } else recordErr(Object.assign({}, memFind(x.id, x.k, x.t), { id: x.id, tema: x.t, _rit: 1 }), r.ok);
  }
  if (r.ok && !r.parcial) R.ok++;
  R.n++;
  if (r.hc) R.hc++;
  // reaprendizaje: si fallas, vuelve a salir 3–5 conceptos más tarde
  if (!r.ok || r.parcial) {
    R.reint[x.id] = (R.reint[x.id] || 0) + 1;
    if (R.reint[x.id] <= 3)
      R.cola.splice(
        Math.min(R.cola.length, R.i + 3 + Math.floor(Math.random() * 3)),
        0,
        Object.assign({}, x, { repe: true, nueva: false, rescate: false }),
      );
  }
  R.pend = null;
  statAdd(x.k === 'c' ? 'c' : 'q', 1);
  logAct(1);
}

function ritSave() {
  kvSet('mem');
  kvSet('piles');
}

/* ---------- vistas ---------- */
function vCalib() {
  const c = (S.mem || {}).cal || {};
  const fila = (k, t) => {
    const v = c[k];
    if (!v || v[1] < 5) return '';
    return `<li>${t}: aciertas el <b>${Math.round((v[0] / v[1]) * 100)} %</b></li>`;
  };
  const html = fila('seg', '⚡ Cuando respondes rápido') + fila('dudo', '🐢 Cuando te lo piensas');
  if (!html) return '';
  const s = c.seg;
  const aviso =
    s && s[1] >= 10 && s[0] / s[1] < 0.8
      ? '<p class="fine">Ojo: a veces respondes muy rápido y fallas. Esas preguntas te las vuelvo a poner mañana.</p>'
      : '';
  return `<div class="card"><h3>🎯 Tu seguridad</h3><ul class="calib">${html}</ul>${aviso}</div>`;
}

function vRitmoInicio() {
  const items = memItems(),
    now = Date.now();
  const lista = Object.values(items);
  const due = memDueCount();
  const peligro = lista.filter((it) => it.due > now && memR((now - it.l) / MEM_DIA, it.s) < 0.92).length;
  const firmes = lista.filter((it) => it.s >= 21).length;
  const dificiles = Object.entries(items)
    .filter(([, it]) => it.cost)
    .sort((a, b) => b[1].x + b[1].hc - (a[1].x + a[1].hc))
    .slice(0, 5)
    .map(([id, it]) => {
      const c = memFind(id, it.k, it.t);
      const t = S.temas.find((z) => z.id === it.t);
      return c
        ? `<li><span class="tag" style="background:${(BL[(t || {}).bloque] || BL.I).c}">${esc(t ? t.codigo : it.t)}</span><span>${esc(plain(c.q || '').slice(0, 110))}</span><small>${it.x + it.hc} ${it.x + it.hc === 1 ? 'fallo' : 'fallos'}</small></li>`
        : '';
    })
    .join('');
  return `<div class="rit-home"><p class="sub">Te pregunto lo que estás a punto de olvidar. En las tarjetas <b>escribes tu respuesta</b> y la corrijo yo: así no hay trampa. Lo que fallas vuelve hasta que lo aciertas y, de vez en cuando, te rescato algo que te costó.</p>
  <div class="card rit-hero"><div class="rit-big"><b>${due}</b><span>${due === 1 ? 'concepto toca' : 'conceptos tocan'} hoy</span></div>
  <div class="acts"><button class="btn" data-act="ritgo" data-n="10">Sesión corta (10)</button><button class="btn" data-act="ritgo" data-n="20">Normal (20)</button><button class="btn ghost" data-act="ritgo" data-n="40">Larga (40)</button></div>
  <p class="fine">Si no hay suficientes repasos, añado tarjetas nuevas de los temas que estás estudiando.</p></div>
  <div class="kpis"><div class="kpi"><b>${lista.length}</b><span>conceptos en tu memoria</span></div><div class="kpi"><b>${firmes}</b><span>bien asentados (3+ semanas)</span></div><div class="kpi"><b>${peligro}</b><span>a punto de olvidarse</span></div></div>
  ${vCalib()}
  ${dificiles ? `<div class="card"><h3>🧗 Lo que más te ha costado</h3><ul class="costo">${dificiles}</ul><p class="fine">Estos vuelven a salir de vez en cuando aunque ya los sepas.</p></div>` : ''}
  <details class="card"><summary><b>¿Cómo funciona?</b></summary><ul class="fine">
  <li><b>Repaso espaciado:</b> cada concepto vuelve justo antes de que lo olvides; cuanto mejor lo sabes, más tarda en volver.</li>
  <li><b>Corrección automática:</b> en las tarjetas escribes lo que crees. Compruebo si están las <b>ideas clave</b> (lo que va en negrita), aunque lo digas con otras palabras o con alguna falta. Los números y artículos tienen que estar exactos.</li>
  <li><b>Tu seguridad, sin preguntarte:</b> la mido por lo que tardas en <b>empezar a escribir</b> (lo que tardas en recordar, no en teclear), comparado con lo normal en ti. Acertar rápido = lo sabes; acertar tras pensarlo mucho = vuelve antes.</li>
  <li><b>Errores «seguros»:</b> si fallas algo respondiendo rápido, es que creías saberlo. Te lo destaco y te lo vuelvo a poner mañana: está estudiado que esos errores se corrigen muy bien si se repasan.</li>
  <li><b>Hasta acertarlo:</b> lo que fallas (o aciertas a medias) vuelve a salir en la misma sesión.</li>
  <li><b>Rescate:</b> lo que te costó aprender reaparece de vez en cuando.</li></ul></details></div>`;
}

function vRitmoSesion() {
  const R = ui.rit,
    x = R.cola[R.i];
  if (!x) {
    ritSave();
    const pct = R.n ? Math.round((R.ok / R.n) * 100) : 0;
    const msg = R.hc
      ? `Has corregido <b>${R.hc}</b> ${R.hc === 1 ? 'error' : 'errores'} que creías saber: mañana te ${R.hc === 1 ? 'lo' : 'los'} vuelvo a preguntar.`
      : 'Lo que has fallado volverá pronto; lo que sabías, dentro de más días.';
    return `<div class="card rit-fin"><h2>🎉 Sesión terminada</h2><div class="kpis"><div class="kpi"><b>${R.ini}</b><span>conceptos</span></div><div class="kpi"><b>${pct} %</b><span>de aciertos</span></div></div><p>${msg}</p><div class="acts"><button class="btn" data-act="ritfin">Volver</button><button class="btn ghost" data-act="ritgo" data-n="10">10 más</button></div></div>`;
  }
  if (R.paso === 'q' && !R.t0) R.t0 = Date.now();
  const c = memFind(x.id, x.k, x.t);
  const etiqueta = x.rescate
    ? '<span class="lvl mid">🏆 Esto te costó aprender. ¿Te acuerdas?</span>'
    : x.repe
      ? '<span class="lvl ko">🔁 Otra vez</span>'
      : x.nueva
        ? '<span class="lvl ok">✨ Nueva</span>'
        : '';
  const top = `<div class="rit-top"><span>${Math.min(R.i + 1, R.cola.length)}/${R.cola.length}</span><div class="pbar"><i style="width:${(R.i / R.cola.length) * 100}%"></i></div><button class="mini ghost" data-act="ritfin" aria-label="Terminar sesión">✕</button></div>`;
  const cab = `${top}<div class="rit-meta"><small>${esc(temaName(x.t))}</small>${etiqueta}</div>`;
  // Tarjeta: escribe lo que crees y se corrige sola
  if (x.k === 'c') {
    if (R.paso === 'q')
      return `<div class="card rit">${cab}<div class="rit-q"><span class="emo" aria-hidden="true">${esc(c.e || '🃏')}</span><h2>${rich(c.q)}</h2></div>
      <form class="rit-form" data-ritform="1"><label for="ritin" class="sub">Escribe lo que recuerdes (no hace falta que sea literal):</label><textarea id="ritin" rows="3" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Tu respuesta…"></textarea>
      <div class="rit-conf"><button class="btn" type="submit">Comprobar</button><button class="btn ghost" type="button" data-act="ritnose">🤷 No lo sé</button></div></form></div>`;
    const L = R.last;
    const claves = L.claves
      ? `<ul class="rit-keys">${L.claves.map((k) => `<li class="${k.ok ? 'ok' : 'ko'}${k.extra ? ' extra' : ''}">${k.ok ? '✅' : '❌'} ${esc(k.k)}${k.tuyo ? ` <small>(pusiste ${esc(k.tuyo)})</small>` : ''}</li>`).join('')}</ul>`
      : '';
    const tuya = L.txt ? `<div class="rit-tuya"><small>Tu respuesta</small><p>${esc(L.txt)}</p></div>` : '';
    const otra =
      L.txt && (!L.ok || L.parcial) && !L.override
        ? '<button class="mini ghost" data-act="ritoverride">Lo había puesto bien con otras palabras</button>'
        : '';
    return vRitFb(
      cab,
      `<div class="rit-q"><h2>${rich(c.q)}</h2></div>${tuya}<div class="rit-a">${rich(c.a)}</div>${claves}${otra}`,
    );
  }
  // Pregunta tipo test: elige y se corrige (sin preguntar seguridad)
  if (R.paso === 'q') {
    const opts = c.opts
      .map(
        (o, i) =>
          `<button class="opt" data-act="ritopt" data-i="${i}"><b>${'abcd'[i]})</b> ${esc(o)}</button>`,
      )
      .join('');
    return `<div class="card rit">${cab}<div class="rit-q"><h2>${esc(c.q)}</h2></div><div class="opts">${opts}</div><div class="acts"><button class="mini ghost" data-act="ritnose">🤷 No lo sé</button></div></div>`;
  }
  const opts = c.opts
    .map(
      (o, i) =>
        `<div class="opt ${i === c.c ? 'ok' : i === R.sel ? 'ko' : ''}"><b>${'abcd'[i]})</b> ${esc(o)}</div>`,
    )
    .join('');
  return vRitFb(
    cab,
    `<div class="rit-q"><h2>${esc(c.q)}</h2></div><div class="opts">${opts}</div>${c.exp ? `<p class="fine">${esc(c.exp)}</p>` : ''}`,
  );
}

function vRitFb(cab, cuerpo) {
  const L = ui.rit.last;
  const msg = L.hc
    ? '<div class="rit-hc">😮 <b>¡Ojo! Has respondido rápido, como si lo supieras, y no era así.</b> Fíjate bien: estos errores son los que mejor se corrigen. Te lo vuelvo a preguntar en un rato y mañana.</div>'
    : L.conf === 'azar'
      ? '<div class="rit-fbk ko">📌 Míratelo bien: vuelve a salir en esta misma sesión.</div>'
      : L.parcial
        ? '<div class="rit-fbk mid">🟡 Casi: te falta alguna idea clave. Volverá en un rato.</div>'
        : L.ok && L.conf === 'dudo'
          ? '<div class="rit-fbk ok">✅ ¡Bien! Has tardado un poco en recordarlo, así que volverá algo antes que si te saliera al momento.</div>'
          : L.ok
            ? '<div class="rit-fbk ok">💪 ¡Perfecto! Tardará más en volver.</div>'
            : '<div class="rit-fbk ko">📌 No pasa nada: vuelve a salir en esta misma sesión.</div>';
  return `<div class="card rit">${cab}${cuerpo}${msg}<div class="acts"><button class="btn" data-act="ritnext">Siguiente →</button></div></div>`;
}

function vRitmo() {
  return ui.rit ? vRitmoSesion() : vRitmoInicio();
}

// La primera vez, pasa lo que ya llevabas en «Tarjetas» al modelo de memoria
function memSeed() {
  if (!uid || !S.remoteOk || !Object.keys(S.cards).length) return;
  memBackfill();
  if (S.mem && S.mem.seed) return;
  const items = Object.assign({}, memItems());
  const now = Date.now(),
    EST = [1, 1, 3, 7, 14, 30];
  Object.entries(S.piles || {}).forEach(([tema, ps]) =>
    Object.entries(ps || {}).forEach(([id, p]) => {
      if (items[id] || !p) return;
      const sr = ((S.srs || {})[tema] || {})[id];
      const s = p === 1 ? 0.4 : p === 2 ? 1.2 : EST[(sr && sr.b) || 1];
      const due = sr && sr.d ? new Date(sr.d + 'T08:00:00').getTime() : now;
      items[id] = {
        s,
        d: p === 1 ? 7 : p === 2 ? 6 : 4.5,
        r: 1,
        x: p === 1 ? 1 : 0,
        hc: 0,
        t: tema,
        k: 'c',
        l: due - s * MEM_DIA,
        due,
      };
    }),
  );
  errList().forEach((q) => {
    if (!items[q.id] && q.opts)
      items[q.id] = { s: 0.4, d: 7, r: 1, x: 1, hc: 0, t: q.tema, k: 'q', l: now - MEM_DIA, due: now };
  });
  S.mem = Object.assign({}, S.mem, { items, seed: 1 });
  kvSet('mem');
}

// Las tarjetas repasadas en «A tu ritmo» antes del 27-nov se contaban como preguntas: se recuentan una vez
function memBackfill() {
  if ((S.mem || {}).bf1) return;
  const porDia = {};
  Object.values(memItems()).forEach((it) => {
    if (it.k !== 'c' || !it.l) return;
    const d = dkey(new Date(it.l));
    porDia[d] = (porDia[d] || 0) + 1;
  });
  const dia = Object.assign({}, S.diario);
  Object.entries(porDia).forEach(([d, n]) => {
    const t = Object.assign({}, dia[d]);
    const s = Object.assign({ c: 0, q: 0, p: 0, m: 0 }, t._s);
    if (s.c < n) {
      s.q = Math.max(0, s.q - (n - s.c));
      s.c = n;
    }
    t._s = s;
    dia[d] = t;
  });
  S.diario = dia;
  S.mem = Object.assign({}, S.mem, { bf1: 1 });
  kvSet('diario');
  kvSet('mem');
}
