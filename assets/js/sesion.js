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
  } else if (k === 'scope') ui.scope = v;
  else if (k === 'gscope') {
    setGScope(v);
    return;
  }
  render();
}

/* ---------- comprobar una tarjeta: «me la sé» → test rápido; si fallas, ves la respuesta ---------- */
function opcionesTarjeta(c, tema) {
  const tieneNum = /\d/.test(c.a);
  const base = plain(c.a);
  const otras = shuffle(
    (S.cards[tema] || []).filter((x) => x.id !== c.id && plain(x.a) !== base && plain(x.a).length < 160),
  );
  // primero las que se parecen (con números si la buena los tiene), para que no sea obvio
  otras.sort((a, b) => (/\d/.test(b.a) === tieneNum) - (/\d/.test(a.a) === tieneNum));
  const dist = [];
  for (const x of otras) {
    if (dist.length >= 3) break;
    if (!dist.some((d) => plain(d) === plain(x.a))) dist.push(x.a);
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
    cuerpo = `${tit()}<p class="ses-big">Tema <b>${esc(t.codigo || '')}</b> · págs. <b>${p.a}–${p.b}</b></p><p class="sub">${esc(t.titulo || '')}</p><p>Léelo con calma y subraya lo importante. Si te ayuda, pon un pomodoro de 25 minutos.</p><div class="acts"><button class="btn ghost" data-act="pomo">🍅 Pomodoro 25 min</button>${S.esq[p.tema] ? `<button class="btn ghost" data-act="esq" data-id="${esc(p.tema)}">🗺️ Ver esquema</button>` : ''}</div>${seguir('Ya lo he leído →')}`;
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
    cuerpo = `<h2>🎉 ¡Sesión terminada!</h2><div class="kpis"><div class="kpi"><b>${st.c || 0}</b><span>tarjetas</span></div><div class="kpi"><b>${st.q || 0}</b><span>preguntas</span></div><div class="kpi"><b>${st.p || 0}</b><span>páginas</span></div></div><p>${esc(mascName())} está orgulloso. Mañana te espera lo siguiente; si te apetece más, tienes los exámenes y los juegos libres.</p><div class="acts"><a class="btn" href="#inicio">Volver al inicio</a></div>`;
  }
  return `<div class="ses">${vSesStepper(s)}<div class="card ses-card">${cuerpo}</div></div>`;
}
function vSesBoton() {
  const s = sesHoy();
  if (s && s.pasos[s.i].tipo === 'fin' && s.hechos[s.i - 1])
    return `<a class="ses-cta done" href="#sesion"><b>✅ Sesión de hoy hecha</b><span>Ver resumen</span></a>`;
  if (s) {
    const p = s.pasos[s.i];
    return `<a class="ses-cta" href="#sesion"><b>▶ Seguir con mi sesión</b><span>Paso ${s.i + 1} de ${s.pasos.length}: ${esc(PASO[p.tipo].t)}</span></a>`;
  }
  return `<a class="ses-cta" href="#sesion" data-act="sesgo"><b>▶ Empezar mi sesión de hoy</b><span>Te llevo paso a paso · 1–2 horas</span></a>`;
}
