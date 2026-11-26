/**
 * «A tu ritmo»: repaso adaptativo de conceptos (tarjetas y preguntas).
 *
 * En qué se basa:
 *  - Modelo de memoria tipo FSRS (estabilidad, dificultad y probabilidad de recordar):
 *    cada concepto vuelve justo cuando estás a punto de olvidarlo (~90 % de recuerdo).
 *  - Grado de seguridad: acertar dudando no cuenta igual que acertar seguro, y acertar
 *    adivinando cuenta casi como un fallo.
 *  - Efecto de hipercorrección: los errores que cometes muy segura se corrigen mejor si
 *    se destacan y se vuelven a preguntar pronto (en la misma sesión y al día siguiente).
 *  - Reaprendizaje sucesivo: en cada sesión, lo que fallas vuelve a salir unos minutos
 *    después hasta que lo aciertas.
 *  - Rescate: de vez en cuando vuelve algo que te costó aprender, para que no se pierda.
 *  - Mezcla de temas (práctica intercalada).
 */

const MEM_DIA = 864e5;
const MEM_OBJ = 0.9; // recuerdo deseado al repasar
const CONF = {
  seg: { t: 'Seguro', e: '💪' },
  dudo: { t: 'Dudo', e: '🤔' },
  azar: { t: 'Adivino', e: '🎲' },
};

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

function ritAnswer(ok, conf) {
  const R = ui.rit,
    x = R.cola[R.i];
  const hc = !ok && conf === 'seg';
  const nota = !ok ? 1 : conf === 'azar' ? 1 : conf === 'dudo' ? 2 : x.nueva ? 3 : 4;
  // en la misma sesión solo cuenta el primer intento para el modelo
  if (!R.reint[x.id]) {
    memMark(x.id, x.t, x.k, nota, { hc });
    memCalib(conf, ok);
    statTema(x.t, ok);
    if (x.k === 'c') {
      const piles = Object.assign({}, S.piles[x.t] || {});
      piles[x.id] = ok ? (conf === 'seg' ? 3 : 2) : 1;
      S.piles = Object.assign({}, S.piles, { [x.t]: piles });
    }
  }
  if (ok && conf !== 'azar') R.ok++;
  R.n++;
  if (hc) R.hc++;
  // reaprendizaje: si fallas (o adivinas), vuelve a salir 3–5 conceptos más tarde
  if (!ok || conf === 'azar') {
    R.reint[x.id] = (R.reint[x.id] || 0) + 1;
    if (R.reint[x.id] <= 3)
      R.cola.splice(
        Math.min(R.cola.length, R.i + 3 + Math.floor(Math.random() * 3)),
        0,
        Object.assign({}, x, { repe: true }),
      );
  }
  R.last = { ok, conf, hc };
  R.paso = 'fb';
  statAdd('q', 1);
  logAct(1);
}

function ritSave() {
  kvSet('mem');
  kvSet('piles');
}

/* ---------- vistas ---------- */
function vCalib() {
  const c = (S.mem || {}).cal || {};
  const fila = (k) => {
    const v = c[k];
    if (!v || v[1] < 5) return '';
    return `<li>${CONF[k].e} Cuando dices <b>«${CONF[k].t}»</b> aciertas el <b>${Math.round((v[0] / v[1]) * 100)} %</b></li>`;
  };
  const html = ['seg', 'dudo', 'azar'].map(fila).join('');
  if (!html) return '';
  const s = c.seg;
  const aviso =
    s && s[1] >= 10 && s[0] / s[1] < 0.8
      ? '<p class="fine">Ojo: a veces estás segura y fallas. Esas preguntas te las vuelvo a poner mañana.</p>'
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
      return c
        ? `<li>${esc(plain(c.q || '').slice(0, 90))} <small>· ${esc(temaName(it.t))}</small></li>`
        : '';
    })
    .join('');
  return `<p class="sub">Te pregunto lo que estás a punto de olvidar, lo que fallas vuelve hasta que lo aciertas y, de vez en cuando, te rescato algo que te costó. Tú solo dime cómo de segura estás.</p>
  <div class="card rit-hero"><div class="rit-big"><b>${due}</b><span>${due === 1 ? 'concepto toca' : 'conceptos tocan'} hoy</span></div>
  <div class="acts"><button class="btn" data-act="ritgo" data-n="10">Sesión corta (10)</button><button class="btn" data-act="ritgo" data-n="20">Normal (20)</button><button class="btn ghost" data-act="ritgo" data-n="40">Larga (40)</button></div>
  <p class="fine">Si no hay suficientes repasos, añado tarjetas nuevas de los temas que estás estudiando.</p></div>
  <div class="kpis"><div class="kpi"><b>${lista.length}</b><span>conceptos en tu memoria</span></div><div class="kpi"><b>${firmes}</b><span>bien asentados (3+ semanas)</span></div><div class="kpi"><b>${peligro}</b><span>a punto de olvidarse</span></div></div>
  ${vCalib()}
  ${dificiles ? `<div class="card"><h3>🧗 Lo que más te ha costado</h3><ul class="dlist2">${dificiles}</ul><p class="fine">Estos vuelven a salir de vez en cuando aunque ya los sepas.</p></div>` : ''}
  <details class="card"><summary><b>¿Cómo funciona?</b></summary><ul class="fine">
  <li><b>Repaso espaciado:</b> cada concepto vuelve justo antes de que lo olvides; cuanto mejor lo sabes, más tarda en volver.</li>
  <li><b>Tu seguridad cuenta:</b> acertar dudando hace que vuelva antes; acertar adivinando cuenta como no saberlo.</li>
  <li><b>Errores con seguridad:</b> si fallas algo que creías saber, te lo destaco y te lo vuelvo a poner mañana. Está estudiado que esos errores se corrigen muy bien si se repasan.</li>
  <li><b>Hasta acertarlo:</b> lo que fallas vuelve a salir en la misma sesión.</li>
  <li><b>Rescate:</b> lo que te costó aprender reaparece de vez en cuando.</li></ul></details>`;
}

function vRitmoSesion() {
  const R = ui.rit,
    x = R.cola[R.i];
  if (!x) {
    ritSave();
    const pct = R.n ? Math.round((R.ok / R.n) * 100) : 0;
    const msg = R.hc
      ? `Has corregido <b>${R.hc}</b> ${R.hc === 1 ? 'error' : 'errores'} que hacías con seguridad: mañana te ${R.hc === 1 ? 'lo' : 'los'} vuelvo a preguntar.`
      : 'Lo que has fallado volverá pronto; lo que sabías, dentro de más días.';
    return `<div class="card rit-fin"><h2>🎉 Sesión terminada</h2><div class="kpis"><div class="kpi"><b>${R.ini}</b><span>conceptos</span></div><div class="kpi"><b>${pct} %</b><span>de aciertos</span></div></div><p>${msg}</p><div class="acts"><button class="btn" data-act="ritfin">Volver</button><button class="btn ghost" data-act="ritgo" data-n="10">10 más</button></div></div>`;
  }
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
  const confBtns = (pre) =>
    `<div class="rit-conf" role="group" aria-label="¿Cómo de segura estás?">${Object.entries(CONF)
      .map(([k, v]) => `<button class="btn ghost" data-act="${pre}" data-conf="${k}">${v.e} ${v.t}</button>`)
      .join('')}</div>`;
  // Tarjeta: piensa, di tu seguridad, mira y di si acertaste
  if (x.k === 'c') {
    if (R.paso === 'q')
      return `<div class="card rit">${cab}<div class="rit-q"><span class="emo" aria-hidden="true">${esc(c.e || '🃏')}</span><h2>${rich(c.q)}</h2></div><p class="sub">Piénsalo y di cómo de segura estás antes de mirar.</p>${confBtns('ritconf')}</div>`;
    if (R.paso === 'ver')
      return `<div class="card rit">${cab}<div class="rit-q"><h2>${rich(c.q)}</h2></div><div class="rit-a">${rich(c.a)}</div><p class="sub">¿Lo tenías bien?</p><div class="rit-conf"><button class="btn ok" data-act="ritcard" data-ok="1">✅ Sí</button><button class="btn bad" data-act="ritcard" data-ok="0">❌ No</button></div></div>`;
    return vRitFb(cab, `<div class="rit-q"><h2>${rich(c.q)}</h2></div><div class="rit-a">${rich(c.a)}</div>`);
  }
  // Pregunta tipo test: elige opción, luego seguridad
  if (R.paso === 'q' || R.paso === 'conf') {
    const opts = c.opts
      .map(
        (o, i) =>
          `<button class="opt${R.sel === i ? ' sel' : ''}" data-act="ritopt" data-i="${i}" aria-pressed="${R.sel === i}"><b>${'abcd'[i]})</b> ${esc(o)}</button>`,
      )
      .join('');
    return `<div class="card rit">${cab}<div class="rit-q"><h2>${esc(c.q)}</h2></div><div class="opts">${opts}</div>${R.sel != null ? `<p class="sub">¿Cómo de segura estás?</p>${confBtns('ritqconf')}` : ''}</div>`;
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
    ? '<div class="rit-hc">😮 <b>¡Ojo! Estabas segura y no era así.</b> Fíjate bien: estos errores son los que mejor se corrigen. Te lo vuelvo a preguntar en un rato y mañana.</div>'
    : L.ok && L.conf === 'azar'
      ? '<div class="rit-fbk mid">🎲 Acertaste, pero adivinando: volverá pronto.</div>'
      : L.ok && L.conf === 'dudo'
        ? '<div class="rit-fbk mid">🤔 Bien, aunque dudabas: volverá antes que si lo supieras seguro.</div>'
        : L.ok
          ? '<div class="rit-fbk ok">💪 ¡Perfecto! Tardará más en volver.</div>'
          : '<div class="rit-fbk ko">📌 No pasa nada: vuelve a salir en esta misma sesión.</div>';
  return `<div class="card rit">${cab}${cuerpo}${msg}<div class="acts"><button class="btn" data-act="ritnext" autofocus>Siguiente →</button></div></div>`;
}

function vRitmo() {
  return ui.rit ? vRitmoSesion() : vRitmoInicio();
}

// La primera vez, pasa lo que ya llevabas en «Tarjetas» al modelo de memoria
function memSeed() {
  if (!uid || (S.mem && S.mem.seed) || !Object.keys(S.cards).length) return;
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
