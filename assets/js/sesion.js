/**
 * Sesión guiada de hoy, comprobación de tarjetas con test y selector visual de temas.
 */

/* ---------- selector visual de temas: pestañas de bloque + fichas ---------- */
const BLOQUES = ['I', 'II', 'III', 'IV'];
const tituloCorto = (t) => {
  const s = t.titulo.split(/[:.(]/)[0].trim();
  return s.length > 46 ? s.slice(0, 44) + '…' : s;
};
function progTema(id) {
  const cs = S.cards[id] || [];
  if (!cs.length) return 0;
  const p = S.piles[id] || {};
  return Math.round((cs.filter((c) => p[c.id] === 3).length / cs.length) * 100);
}
/**
 * k: qué selector es (mazo, scope, gscope…) · sel: tema elegido · ids: temas que se pueden elegir
 * todo: texto de la opción «todo» (o null) · bloques: si se pueden elegir bloques enteros
 */
function vTemaPicker({ k, sel, ids, todo, bloques }) {
  ui.tpb = ui.tpb || {};
  const ok = new Set(ids);
  const selT = S.temas.find((t) => t.id === sel);
  let bl = ui.tpb[k] || (selT ? selT.bloque : sel && sel.startsWith('B:') ? sel.slice(2) : 'I');
  const tab = (b) => {
    const hay = S.temas.some((t) => t.bloque === b && ok.has(t.id));
    const on = bl === b;
    return `<button role="tab" aria-selected="${on}" class="tp-tab${on ? ' on' : ''}" style="--c:${BL[b].c}" data-act="tpb" data-k="${k}" data-v="${b}"${hay ? '' : ' disabled'}>Bloque ${b}</button>`;
  };
  const fichas = S.temas
    .filter((t) => t.bloque === bl)
    .sort(ordT)
    .map((t) => {
      const can = ok.has(t.id),
        on = sel === t.id,
        pr = progTema(t.id);
      return `<button class="tp-f${on ? ' on' : ''}" style="--c:${BL[t.bloque].c}" data-act="tpick" data-k="${k}" data-v="${esc(t.id)}" aria-pressed="${on}"${can ? '' : ' disabled title="Aún no tiene contenido"'}><b>${esc(t.codigo)}</b><span>${esc(tituloCorto(t))}</span>${can ? `<i class="tp-bar"><i style="width:${pr}%"></i></i>` : '<small>pronto</small>'}</button>`;
    })
    .join('');
  const extra = [];
  if (todo)
    extra.push(
      `<button class="chip2${!sel ? ' on' : ''}" data-act="tpick" data-k="${k}" data-v="">${esc(todo)}</button>`,
    );
  if (bloques)
    extra.push(
      `<button class="chip2${sel === 'B:' + bl ? ' on' : ''}" data-act="tpick" data-k="${k}" data-v="B:${bl}">Todo el Bloque ${bl}</button>`,
    );
  return `<div class="tpick"><div class="tp-tabs" role="tablist" aria-label="Bloque">${BLOQUES.map(tab).join('')}</div>${extra.length ? `<div class="chips">${extra.join('')}</div>` : ''}<div class="tp-grid">${fichas}</div></div>`;
}
function tpElegir(k, v) {
  if (k === 'mazo') {
    ui.mazo = v;
    ui.idx = 0;
    ui.flip = false;
    ui.mzck = null;
  } else if (k === 'scope') ui.scope = v;
  else if (k === 'gscope') {
    setGScope(v);
    return;
  }
  render();
}

/* ---------- comprobar una tarjeta: «me la sé» → test rápido; si fallas, ves la respuesta ---------- */
// Respuestas falsas que se PARECEN a la buena: mismos textos con otro número (art. 13.2 → 13.1, 23.2…)
function variantesNum(m) {
  const out = new Set();
  if (/\//.test(m)) {
    const [x, y] = m.split('/');
    out
      .add(+x + 1 + '/' + y)
      .add(Math.max(1, +x - 1) + '/' + y)
      .add(x + '/' + (+y + 1))
      .add(x + '/' + (+y - 1));
  } else if (/^\d+[.,]\d+$/.test(m)) {
    const [x, y] = m.split(/[.,]/);
    const sep = m.includes(',') ? ',' : '.';
    out
      .add(x + sep + (+y + 1))
      .add(+y > 1 ? x + sep + (+y - 1) : x + sep + (+y + 2))
      .add(+x + 10 + sep + y)
      .add(x + y);
  } else {
    const n = +m;
    if (n >= 1900 && n <= 2100) [n - 1, n + 1, n - 2, n + 3].forEach((v) => out.add(String(v)));
    else if (n <= 12) [n + 1, n - 1, n + 2, n * 2].filter((v) => v >= 0).forEach((v) => out.add(String(v)));
    else
      [n + 1, n - 1, n + 10, Math.round(n * 1.5), n - 10]
        .filter((v) => v > 0)
        .forEach((v) => out.add(String(v)));
  }
  out.delete(m);
  return [...out];
}
function mutaciones(a) {
  const re = /\d+(?:[.,/]\d+)?/g;
  const ms = [...String(a).matchAll(re)];
  if (!ms.length) return [];
  const res = new Set();
  // se cambia un solo número cada vez, para que se parezca mucho a la buena
  shuffle(ms).forEach((m) => {
    const tras = a.slice(m.index + m[0].length);
    // un día del mes tiene que seguir siendo un día válido
    const esDia =
      /^\**\s*de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i.test(
        tras,
      );
    const vs = esDia
      ? [+m[0] + 1, +m[0] - 1, +m[0] + 7, +m[0] - 7].filter((v) => v >= 1 && v <= 28).map(String)
      : variantesNum(m[0]);
    vs.forEach((v) => res.add(a.slice(0, m.index) + v + tras));
  });
  res.delete(a);
  return shuffle([...res]);
}
function opcionesTarjeta(c, tema) {
  const base = plain(c.a);
  const dist = [];
  const add = (a) => {
    if (dist.length < 3 && plain(a) !== base && !dist.some((d) => plain(d) === plain(a))) dist.push(a);
  };
  // 1) si hay números (artículos, años, plazos, %), cambio solo el número
  mutaciones(c.a).forEach(add);
  // 2) si no, respuestas de tarjetas del mismo tema que se parecen (palabras y longitud)
  if (dist.length < 3) {
    const mio = new Set(toks(c.q + ' ' + c.a).filter((w) => w.length > 3 && !STOP.has(w)));
    const len = base.length;
    (S.cards[tema] || [])
      .filter((x) => x.id !== c.id && plain(x.a).length < 180)
      .map((x) => ({
        x,
        p:
          toks(x.q + ' ' + x.a).filter((w) => mio.has(w)).length * 2 -
          Math.abs(plain(x.a).length - len) / 25 +
          (/\d/.test(x.a) === /\d/.test(c.a) ? 1 : 0) +
          Math.random(),
      }))
      .sort((a, b) => b.p - a.p)
      .forEach(({ x }) => add(x.a));
  }
  return shuffle([{ a: c.a, ok: true }].concat(dist.map((a) => ({ a, ok: false }))));
}

/* ---------- sesión guiada de hoy ---------- */
function sesHoy() {
  let s = ui.ses;
  if (!s || s.fecha !== today()) {
    s = lsGet('ses');
    if (!s || s.fecha !== today()) s = null;
  }
  return (ui.ses = s);
}
function sesGuardar() {
  lsSet('ses', ui.ses);
}
function crearSesion() {
  const H = planHoy();
  const tareas = H.tareas || [];
  const pasos = [];
  const temasHoy = [];
  tareas
    .filter((t) => t.tipo === 'lect')
    .forEach((t) => {
      pasos.push({ tipo: 'leer', tema: t.tema, a: t.a, b: t.b, k: t.k, txt: t.txt });
      temasHoy.push(t.tema);
    });
  // tarjetas nuevas: las siguientes sin estudiar de cada tema de hoy (van en el orden de los apuntes)
  const nuevas = [];
  tareas
    .filter((t) => t.tipo === 'cards')
    .forEach((t) => {
      const p = S.piles[t.tema] || {};
      temaCards(t.tema)
        .filter((c) => !p[c.id] && !memItems()[c.id])
        .slice(0, t.n || 20)
        .forEach((c) => nuevas.push({ id: c.id, k: 'c', t: t.tema, nueva: true }));
      if (!temasHoy.includes(t.tema)) temasHoy.push(t.tema);
    });
  if (nuevas.length)
    pasos.push({
      tipo: 'nuevas',
      cola: nuevas.slice(0, 25),
      k: (tareas.find((t) => t.tipo === 'cards') || {}).k,
    });
  // test de lo de hoy: preguntas del tema que hablan de lo mismo que las tarjetas nuevas
  if (nuevas.length) {
    const txt = toks(
      nuevas
        .map((x) => {
          const c = memFind(x.id, 'c', x.t);
          return c ? c.q + ' ' + c.a : '';
        })
        .join(' '),
    ).filter((w) => w.length > 4);
    const bolsa = new Set(txt);
    const qs = temasHoy
      .flatMap((t) => bank(t).map((q) => ({ q, t })))
      .map((o) => ({ o, n: toks(o.q.q + ' ' + o.q.opts[o.q.c]).filter((w) => bolsa.has(w)).length }))
      .filter((x) => x.n >= 2)
      .sort((a, b) => b.n - a.n)
      .slice(0, 8)
      .map((x) => ({ id: x.o.q.id || hash(x.o.q.q), k: 'q', t: x.o.t }));
    if (qs.length >= 3) pasos.push({ tipo: 'test', cola: shuffle(qs) });
  }
  const usados = new Set(nuevas.map((x) => x.id));
  const rep = memDue()
    .filter((it) => !usados.has(it.id))
    .slice(0, 20)
    .map((it) => ({ id: it.id, k: it.k, t: it.t }));
  if (rep.length)
    pasos.push({ tipo: 'repaso', cola: rep, k: (tareas.find((t) => t.tipo === 'rep') || {}).k });
  pasos.push({ tipo: 'juego', tema: temasHoy[0] || '' });
  pasos.push({ tipo: 'fin' });
  ui.ses = { fecha: today(), i: 0, pasos, hechos: {} };
  sesGuardar();
}
const PASO = {
  leer: { e: '📖', t: 'Lee y subraya' },
  nuevas: { e: '🃏', t: 'Tarjetas nuevas' },
  test: { e: '📝', t: 'Test de lo de hoy' },
  repaso: { e: '🔁', t: 'Repaso' },
  juego: { e: '🎮', t: 'Un juego para cerrar' },
  fin: { e: '✅', t: 'Resumen' },
};
function sesAvanzar() {
  const s = ui.ses;
  s.hechos[s.i] = 1;
  const p = s.pasos[s.i];
  if (p && p.k) marcarTarea(p.k, true);
  s.i = Math.min(s.pasos.length - 1, s.i + 1);
  sesGuardar();
}
function vSesStepper(s) {
  return `<ol class="ses-steps">${s.pasos
    .map(
      (p, i) =>
        `<li class="${i === s.i ? 'on' : s.hechos[i] ? 'ok' : ''}" title="${esc(PASO[p.tipo].t)}"><span>${s.hechos[i] ? '✓' : PASO[p.tipo].e}</span></li>`,
    )
    .join('')}</ol>`;
}
function vSesion() {
  if (ui.rit && ui.rit.ses) return vRitmoSesion();
  const s = sesHoy();
  if (!s)
    return `<div class="ses-ini card"><h2>▶ Tu sesión de hoy</h2><p>Te llevo paso a paso: leer, tarjetas nuevas de lo leído, un test de eso mismo, el repaso que toca y un juego para cerrar. Tú solo dale a «Siguiente».</p><button class="btn" data-act="sesgo">Empezar</button></div>`;
  const p = s.pasos[s.i];
  const tit = (n) =>
    `<p class="ses-n">Paso ${s.i + 1} de ${s.pasos.length}</p><h2>${PASO[p.tipo].e} ${PASO[p.tipo].t}</h2>`;
  const seguir = (txt) =>
    `<div class="acts"><button class="btn" data-act="sesnext">${txt || 'Hecho, siguiente →'}</button><button class="mini ghost" data-act="sesskip">Saltar este paso</button></div>`;
  let cuerpo = '';
  if (p.tipo === 'leer') {
    const t = S.temas.find((x) => x.id === p.tema) || {};
    cuerpo = `${tit()}<p class="ses-big">Tema <b>${esc(t.codigo || '')}</b> · págs. <b>${p.a}–${p.b}</b></p><p class="sub">${esc(t.titulo || '')}</p><p>Léelo con calma y subraya lo importante. Si te ayuda, pon un pomodoro de 25 minutos.</p><div class="acts"><button class="btn ghost" data-act="pomo">🍅 Pomodoro 25 min</button>${S.esq[p.tema] ? `<button class="btn ghost" data-act="esq" data-id="${esc(p.tema)}">🗺️ Ver esquema</button>` : ''}</div>${seguir('Ya lo he leído →')}<button class="mini ghost" data-act="leer" data-v="0">No leo los apuntes: quitar este paso siempre</button>`;
  } else if (p.tipo === 'nuevas' || p.tipo === 'test' || p.tipo === 'repaso') {
    const n = p.cola.length;
    const expl = {
      nuevas: `Son las <b>${n}</b> tarjetas siguientes de lo que estás estudiando. Si dices «me la sé», te pongo un test rápido para comprobarlo; si no, ves la respuesta.`,
      test: `<b>${n}</b> preguntas tipo examen sobre lo mismo que acabas de estudiar.`,
      repaso: `<b>${n}</b> conceptos que estás a punto de olvidar o que fallaste otros días.`,
    }[p.tipo];
    cuerpo = `${tit()}<p>${expl}</p><div class="acts"><button class="btn" data-act="sesrit">Empezar</button><button class="mini ghost" data-act="sesskip">Saltar este paso</button></div>`;
  } else if (p.tipo === 'juego') {
    const t = S.temas.find((x) => x.id === p.tema);
    cuerpo = `${tit()}<p>Una partida rápida${t ? ` con el tema <b>${esc(t.codigo)}</b>` : ''} para acabar con buen sabor de boca.</p><div class="acts"><button class="btn" data-act="sesjuego" data-k="vf">⚡ Verdadero o falso (1 min)</button><button class="btn ghost" data-act="sesjuego" data-k="cf">✍️ Completa la frase</button></div>${seguir('Ya he jugado →')}`;
  } else {
    const st = ((S.diario || {})[today()] || {})._s || {};
    cuerpo = `<h2>🎉 ¡Sesión terminada!</h2><div class="kpis"><div class="kpi"><b>${st.c || 0}</b><span>tarjetas</span></div><div class="kpi"><b>${st.q || 0}</b><span>preguntas</span></div><div class="kpi"><b>${st.p || 0}</b><span>páginas</span></div></div>${s.ritmo ? `<p class="rit-fbk ${s.ritmo === 'sube' ? 'ok' : 'mid'}">${s.ritmo === 'sube' ? '🚀 Te las sabías casi todas: a partir de mañana te pongo más tarjetas nuevas cada día.' : '🐢 Hoy ha costado: mañana te pongo algunas menos para que se asienten.'}</p>` : ''}<p>${esc(mascName())} está orgulloso. ¿Te ha sabido a poco?</p>${vExtras()}<div class="acts"><a class="btn ghost" href="#inicio">Volver al inicio</a></div>`;
  }
  const reset = `<button class="mini ghost ses-reset" data-act="sesreset">${ui.sesReset ? '¿Seguro? Pulsa otra vez' : '↺ Empezar el día de hoy de 0'}</button>`;
  return `<div class="ses">${vSesStepper(s)}<div class="card ses-card">${cuerpo}</div>${reset}</div>`;
}
function vSesBoton() {
  const s = sesHoy();
  if (s && s.pasos[s.i].tipo === 'fin' && s.hechos[s.i - 1])
    return `<a class="ses-cta done" href="#sesion"><b>✅ Sesión de hoy hecha</b><span>Ver resumen</span></a><div class="card extras-home"><b>¿Te ha sabido a poco?</b>${vExtras()}</div><button class="mini ghost ses-reset" data-act="sesreset">${ui.sesReset ? '¿Seguro? Pulsa otra vez' : '↺ Empezar el día de hoy de 0'}</button>`;
  if (s) {
    const p = s.pasos[s.i];
    return `<a class="ses-cta" href="#sesion"><b>▶ Seguir con mi sesión</b><span>Paso ${s.i + 1} de ${s.pasos.length}: ${esc(PASO[p.tipo].t)}</span></a><button class="mini ghost ses-reset" data-act="sesreset">${ui.sesReset ? '¿Seguro? Pulsa otra vez' : '↺ Empezar el día de hoy de 0'}</button>`;
  }
  return `<a class="ses-cta" href="#sesion" data-act="sesgo"><b>▶ Empezar mi sesión de hoy</b><span>Te llevo paso a paso · 1–2 horas</span></a>`;
}

// «Empezar el día de hoy de 0»: quita lo marcado hoy y rehace la sesión desde el primer paso
function reiniciarSesion() {
  reiniciarHoy();
  ui.rit = null;
  ui.ses = null;
  lsSet('ses', null);
  crearSesion();
}

/* ---------- más estudio cuando la sesión se queda corta ---------- */
// Tarjetas que has estudiado (por tema)
function tarjetasVistas() {
  const v = {};
  const add = (t, id) => (v[t] = v[t] || new Set()).add(id);
  Object.entries(memItems()).forEach(([id, it]) => it.k === 'c' && it.t && add(it.t, id));
  Object.entries(S.piles || {}).forEach(([t, p]) => Object.keys(p || {}).forEach((id) => add(t, id)));
  return v;
}
// Temas que ya llevas: has estudiado al menos la mitad de sus tarjetas
function temasEmpezados() {
  const v = tarjetasVistas();
  return S.temas
    .filter((t) => v[t.id] && v[t.id].size >= Math.max(5, (S.cards[t.id] || []).length * 0.5))
    .sort(ordT);
}
// Preguntas que se pueden contestar con las tarjetas que YA has estudiado:
// la respuesta buena y parte de la pregunta tienen que aparecer en esas tarjetas
function preguntasCubiertas(fuente) {
  const v = tarjetasVistas();
  const vocab = {};
  Object.entries(v).forEach(([t, ids]) => {
    const set = new Set();
    (S.cards[t] || []).forEach(
      (c) =>
        ids.has(c.id) &&
        toks(c.q + ' ' + c.a + ' ' + (c.h || '')).forEach((w) => w.length > 3 && !STOP.has(w) && set.add(w)),
    );
    vocab[t] = set;
  });
  return (
    fuente
      // solo temas de los que has visto al menos un 30 % de las tarjetas
      .filter(
        (q) =>
          q.tema &&
          vocab[q.tema] &&
          v[q.tema].size >= (S.cards[q.tema] || []).length * 0.3 &&
          q.opts &&
          q.opts[q.c] != null,
      )
      .map((q) => {
        const V = vocab[q.tema];
        const resp = toks(q.opts[q.c]).filter((w) => (w.length > 3 && !STOP.has(w)) || /^\d/.test(w));
        const preg = toks(q.q).filter((w) => w.length > 3 && !STOP.has(w));
        const r = resp.length ? resp.filter((w) => V.has(w)).length / resp.length : 0;
        const pq = preg.length ? preg.filter((w) => V.has(w)).length / preg.length : 0;
        return { q, sc: r * 2 + pq, ok: r >= 0.5 && pq >= 0.25 };
      })
      .filter((x) => x.ok)
      .sort((a, b) => b.sc - a.sc)
      .map((x) => x.q)
  );
}
// Siguientes tarjetas sin ver: primero del tema que llevas, luego de los siguientes del plan
function siguientesNuevas(n) {
  const orden = S.temas
    .filter((t) => (S.cards[t.id] || []).length)
    .sort((a, b) => String(a.semana).localeCompare(String(b.semana)) || ordT(a, b));
  const out = [];
  for (const t of orden) {
    const p = S.piles[t.id] || {};
    for (const c of temaCards(t.id)) {
      if (out.length >= n) return out;
      if (!p[c.id] && !memItems()[c.id]) out.push({ id: c.id, k: 'c', t: t.id, nueva: true });
    }
  }
  return out;
}
function vExtras() {
  const sig = siguientesNuevas(25);
  const temaSig = sig.length ? S.temas.find((t) => t.id === sig[0].t) : null;
  const okOfi = preguntasCubiertas(ofiQs(true));
  const okWeb = preguntasCubiertas(Object.keys(S.cards).flatMap((t) => bank(t)));
  const nq = okOfi.length + okWeb.length;
  const temas = [...new Set(okOfi.concat(okWeb).map((q) => q.tema))]
    .map((id) => S.temas.find((t) => t.id === id))
    .filter(Boolean)
    .sort(ordT);
  return `<div class="modes extras">
  <button class="mode" data-act="exadel"${sig.length ? '' : ' disabled'}><b>➕ Adelantar ${sig.length} tarjetas</b><span>${temaSig ? `Lo siguiente: tema ${esc(temaSig.codigo)}. El plan se recoloca solo.` : 'Ya has visto todas las tarjetas.'}</span></button>
  <button class="mode" data-act="exsabes"${nq >= 5 ? '' : ' disabled'}><b>📝 Test de lo que ya sabes</b><span>${nq >= 5 ? `${Math.min(15, nq)} preguntas (oficiales y de la web) que se contestan con las tarjetas que ya has estudiado${temas.length ? ` · ${esc(temas.map((t) => t.codigo).join(', '))}` : ''}.` : 'Cuando estudies más tarjetas, aquí saldrán preguntas sobre ellas.'}</span></button>
  <button class="mode" data-act="exexpres"${nq >= 10 ? '' : ' disabled'}><b>⏱️ Examen exprés de lo que llevas</b><span>${nq >= 10 ? `${Math.min(20, nq)} preguntas (primero las oficiales) a 1,2 minutos cada una, como el real. Corrige al final.` : `Hacen falta al menos 10 preguntas de lo que has estudiado (ahora hay ${nq}).`}</span></button></div>`;
}
function startAdelantar() {
  const cola = siguientesNuevas(25);
  if (!cola.length) return;
  ui.rit = { cola, i: 0, paso: 'q', ok: 0, n: 0, reint: {}, hc: 0, ini: cola.length, extra: 1 };
  location.hash = 'tarjetas';
  ui.ttab = 'ritmo';
  render();
}
function startSabes() {
  const ofi = shuffle(preguntasCubiertas(ofiQs(true)));
  const web = shuffle(preguntasCubiertas(Object.keys(S.cards).flatMap((t) => bank(t))));
  const qs = ofi.slice(0, 10).concat(web).slice(0, 15);
  if (!qs.length) return;
  startExam({
    kind: 'gen',
    titulo: 'Test de lo que ya sabes',
    qs: shuffle(qs),
    modo: 'momento',
    tiempo: 'libre',
    pistas: 'no',
  });
}
function startExpres() {
  const qs = shuffle(
    shuffle(preguntasCubiertas(ofiQs(true)))
      .concat(shuffle(preguntasCubiertas(Object.keys(S.cards).flatMap((t) => bank(t)))))
      .slice(0, 20),
  );
  if (!qs.length) return;
  startExam({
    kind: 'gen',
    titulo: 'Examen exprés de lo que llevas',
    qs,
    modo: 'final',
    tiempo: 'oficial',
    pistas: 'no',
  });
}
