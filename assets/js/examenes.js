/**
 * Exámenes oficiales, simulacros, supuestos y tests del grupo (cifrados).
 */
/* ---------- tests del grupo (cifrados, solo para quien tiene la clave) ---------- */
async function loadGrupo() {
  const k = (S.claves || {}).grupo;
  if (!k || S.grupo) return;
  try {
    const b64 = await fetch('data/privado/grupo.enc?v=1').then((r) => r.text());
    const buf = Uint8Array.from(atob(b64.trim()), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      'raw',
      Uint8Array.from(atob(k), (c) => c.charCodeAt(0)),
      'AES-GCM',
      false,
      ['decrypt'],
    );
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12));
    S.grupo = JSON.parse(new TextDecoder().decode(pt));
    if (!busy()) render();
  } catch (e) {
    console.warn('grupo', e);
  }
}
/* ---------- exámenes ---------- */
const yearOf = (e) => (e.titulo.match(/OEP ([\d-]+)/) || [])[1] || e.fecha;
async function loadExams() {
  const idx = await getJ('data/examenes/index.json');
  if (!idx) return;
  S.exIdx = idx;
  await Promise.all(
    idx.map(async (m) => {
      const e = await getJ(`data/examenes/${m.id}.json`);
      if (e) S.exams[m.id] = e;
    }),
  );
  if (!busy()) render();
}
function ofiQs(onlyP1) {
  const out = [];
  idxOrder().forEach((m) => {
    const e = S.exams[m.id];
    if (!e) return;
    e.partes.forEach((p) => {
      if (onlyP1 && p.id !== 'p1') return;
      p.preguntas.forEach((q) => {
        if (q.anulada || q.c < 0) return;
        out.push(
          Object.assign({}, q, {
            id: e.id + ':' + q.id,
            src: e.titulo,
            anio: yearOf(e),
            bloque: q.bloque || (q.tema ? q.tema.split('-')[0] : (p.bloques || [])[0] || null),
            tema: q.tema || null,
            sup: p.id !== 'p1' ? p.titulo : null,
            enun: p.id !== 'p1' ? p.enunciado : null,
            oficial: true,
          }),
        );
      });
    });
  });
  return out;
}
const idxOrder = () => (S.exIdx || []).slice();
const bOfT = (t) => (t ? t.split('-')[0] : null);
function ownQs() {
  const o = [];
  Object.entries(S.preg).forEach(([t, a]) =>
    a.forEach((q) => o.push(Object.assign({}, q, { tema: t, bloque: bOfT(t) }))),
  );
  return o;
}
function pista(q) {
  const w = q.opts.map((_, i) => i).filter((i) => i !== q.c);
  return w[[...String(q.id)].reduce((a, c) => a + c.charCodeAt(0), 0) % w.length];
}
function startExam(cfg) {
  const secs = [];
  let mins = null;
  if (cfg.secs) {
    cfg.secs.forEach((s) => secs.push(s));
  } else if (cfg.qs) {
    secs.push({ titulo: cfg.titulo, qs: cfg.qs });
  } else if (cfg.kind === 'oficial') {
    const e = S.exams[cfg.id];
    if (!e) return;
    const p1 = e.partes[0];
    secs.push({
      titulo: 'Primera parte',
      qs: p1.preguntas
        .filter((q) => !q.anulada && q.c >= 0)
        .map((q) => Object.assign({}, q, { id: e.id + ':' + q.id, src: e.titulo })),
    });
    if (cfg.sup !== 'no') {
      const s = e.partes.find((p) => (p.bloques || [])[0] === cfg.sup);
      if (s)
        secs.push({
          titulo: 'Segunda parte · ' + s.titulo + ' (Bloque ' + cfg.sup + ')',
          enun: s.enunciado,
          qs: s.preguntas
            .filter((q) => !q.anulada && q.c >= 0)
            .map((q) => Object.assign({}, q, { id: e.id + ':' + q.id, src: e.titulo })),
        });
    }
  } else if (cfg.kind === 'gen') {
    const pool = shuffle(ofiQs(true).concat(ownQs()));
    const want = { I: 22, II: 15, III: 21, IV: 22 },
      seen = new Set(),
      qs = [];
    ['I', 'II', 'III', 'IV'].forEach((b) => {
      pool
        .filter((q) => q.bloque === b)
        .forEach((q) => {
          const k = plain(q.q).slice(0, 60);
          if (want[b] > 0 && !seen.has(k)) {
            seen.add(k);
            qs.push(q);
            want[b]--;
          }
        });
    });
    secs.push({ titulo: 'Primera parte', qs });
    if (cfg.sup !== 'no') {
      const sups = [];
      Object.values(S.exams).forEach((e) =>
        e.partes.forEach((p) => {
          if ((p.bloques || [])[0] === cfg.sup) sups.push({ e, p });
        }),
      );
      if (sups.length) {
        const { e, p } = sups[Math.floor(Math.random() * sups.length)];
        secs.push({
          titulo: 'Segunda parte · Supuesto del Bloque ' + cfg.sup + ' (' + yearOf(e) + ')',
          enun: p.enunciado,
          qs: p.preguntas
            .filter((q) => !q.anulada && q.c >= 0)
            .map((q) => Object.assign({}, q, { id: e.id + ':' + q.id, src: e.titulo })),
        });
      }
    }
  } else {
    let pool =
      cfg.fuente === 'grupo'
        ? (S.grupo || []).map((q) => Object.assign({}, q, { id: 'grupo:' + q.id, grupo: true }))
        : (cfg.fuente === 'ofi' ? [] : ownQs()).concat(ofiQs(true));
    if (cfg.tema) pool = pool.filter((q) => q.tema === cfg.tema);
    else if (cfg.bloque) pool = pool.filter((q) => q.bloque === cfg.bloque);
    const seen = new Set();
    pool = shuffle(pool)
      .filter((q) => {
        const k = plain(q.q).slice(0, 60);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, cfg.n || 20);
    if (!pool.length) {
      flash('No hay preguntas para esa selección');
      return;
    }
    secs.push({ titulo: cfg.titulo || 'Simulacro', qs: pool });
  }
  const items = [];
  secs.forEach((s, si) => s.qs.forEach((q) => items.push({ q, s: si })));
  if (!items.length) return;
  if (cfg.tiempo === 'oficial') mins = Math.round(items.length * 1.2);
  ui.ex = {
    titulo: cfg.titulo,
    kind: cfg.kind,
    sem: cfg.sem,
    secs,
    items,
    i: 0,
    ans: {},
    dud: {},
    pis: {},
    shown: {},
    modo: cfg.modo || 'final',
    pistas: cfg.pistas === 'si',
    end: mins ? Date.now() + mins * 60000 : null,
    mins,
    t0: Date.now(),
    done: false,
    conf: false,
    filt: 'fallos',
  };
  ui.xcfg = null;
  clearInterval(exTimer);
  if (mins) exTimer = setInterval(exTick, 1000);
  location.hash = 'tests';
  render();
  scrollTo(0, 0);
}
let exTimer = null;
function exTick() {
  const X = ui.ex;
  if (!X || X.done || !X.end) {
    clearInterval(exTimer);
    return;
  }
  const l = X.end - Date.now();
  if (l <= 0) {
    finishExam();
    return;
  }
  const el = $('#xt');
  if (el) el.textContent = fmtT(l);
}
const fmtT = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
};
function secScore(X, si, skipDud) {
  let a = 0,
    f = 0,
    b = 0;
  X.items.forEach((it, i) => {
    if (it.s !== si) return;
    const v = X.ans[i];
    if (v == null || (skipDud && X.dud[i])) b++;
    else if (v === it.q.c) a++;
    else f++;
  });
  const n = a + f + b;
  return { a, f, b, n, nota: n ? (Math.max(0, a - f / 3) / n) * 10 : 0 };
}
// Corrige solo las preguntas respondidas (para tests largos que no terminas)
function recortarExamen(X) {
  const keep = X.items.map((_, i) => i).filter((i) => X.ans[i] != null);
  const total = X.items.length;
  const ans = {},
    dud = {},
    pis = {};
  const usadas = [...new Set(keep.map((i) => X.items[i].s))];
  X.items = keep.map((i, j) => {
    if (X.ans[i] != null) ans[j] = X.ans[i];
    if (X.dud[i]) dud[j] = X.dud[i];
    if (X.pis && X.pis[i]) pis[j] = X.pis[i];
    return Object.assign({}, X.items[i], { s: usadas.indexOf(X.items[i].s) });
  });
  X.secs = usadas.map((s) => X.secs[s]);
  X.ans = ans;
  X.dud = dud;
  X.pis = pis;
  X.titulo += ` (${keep.length} de ${total} respondidas)`;
  X.parcial = true;
}
function finishExam(parcial) {
  const X = ui.ex;
  if (!X || X.done) return;
  if (parcial) recortarExamen(X);
  clearInterval(exTimer);
  X.done = true;
  X.secsR = X.secs.map((_, si) => secScore(X, si, false));
  X.secsD = X.secs.map((_, si) => secScore(X, si, true));
  let a = 0,
    f = 0,
    b = 0;
  X.secsR.forEach((r) => {
    a += r.a;
    f += r.f;
    b += r.b;
  });
  let sg = (S.rec || {}).acSeg || 0,
    mx = (S.rec || {}).acMax || 0;
  X.items.forEach((it, i) => {
    const v = X.ans[i];
    if (v != null) {
      recordErr(it.q, v === it.q.c);
    }
    if (v === it.q.c) {
      sg++;
      mx = Math.max(mx, sg);
    } else sg = 0;
  });
  S.rec = Object.assign({}, S.rec, { acSeg: sg, acMax: mx });
  kvSet('records');
  kvSet('errores');
  statAdd('q', a + f);
  const r = {
    titulo: X.titulo,
    fecha: new Date().toISOString(),
    aciertos: a,
    fallos: f,
    blanco: b,
    total: a + f + b,
    testId: 'ex-' + X.kind,
    pistas: Object.keys(X.pis).length,
    netas: X.secsR.map(netas),
  };
  if (X.sem) r.sem = X.sem;
  if (X.kind === 'nivel') guardarNivel(X);
  S.res = S.res.concat([r]);
  kvSet('resultados');
  logAct(a + f);
  render();
  scrollTo(0, 0);
}
function vExam() {
  const X = ui.ex;
  if (X.done) return vExamEnd();
  const it = X.items[X.i],
    q = it.q,
    sec = X.secs[it.s],
    ans = X.ans[X.i],
    shown = X.modo === 'momento' && ans != null,
    hid = X.pis[X.i];
  const first = X.items.findIndex((x) => x.s === it.s) === X.i;
  const grid = X.items
    .map((x, i) => {
      let c = '';
      if (X.modo === 'momento' && X.ans[i] != null) c = X.ans[i] === x.q.c ? 'ok' : 'ko';
      else if (X.ans[i] != null) c = 'an';
      return `<button class="g ${c}${X.dud[i] ? ' du' : ''}${i === X.i ? ' cur' : ''}" data-xgo="${i}" aria-label="Pregunta ${i + 1}${X.ans[i] != null ? ', respondida' : ''}${X.dud[i] ? ', dudosa' : ''}">${i + 1}</button>`;
    })
    .join('');
  const nAns = Object.keys(X.ans).length;
  return `<div class="exam"><div class="xtop"><b>${esc(X.titulo)}</b><span class="xmeta">${X.end ? `<span aria-label="Tiempo restante">⏱ <span id="xt">${fmtT(X.end - Date.now())}</span></span>` : ''}<span>${nAns}/${X.items.length} respondidas</span></span></div>
  <div class="xbody"><section class="xq">
  ${X.secs.length > 1 ? `<p class="xsec">${esc(sec.titulo)}</p>` : ''}${sec.enun ? `<details class="enun"${first ? ' open' : ''}><summary>Enunciado del supuesto</summary><p>${esc(sec.enun)}</p></details>` : ''}
  <p class="qn">Pregunta ${X.i + 1}${X.kind !== 'oficial' ? ` · <span class="srcq">${q.oficial ? 'Examen oficial OEP ' + esc(q.anio) : String(q.id).startsWith('grupo:') ? 'Tests del grupo' + (q.src ? ' · ' + esc(q.src) : '') : 'Pregunta de la web'}</span>` : ''}</p>
  ${q.sup && !sec.enun ? `<details class="enun"><summary>Enunciado: ${esc(q.sup)}</summary><p>${esc(q.enun || '')}</p></details>` : ''}
  <p class="qtext" id="xqt">${rich(q.q)}</p>
  <div role="radiogroup" aria-labelledby="xqt">${q.opts
    .map((o, k) => {
      if (hid === k && !shown)
        return `<button class="opt off" disabled aria-label="${'abcd'[k]}) descartada por la pista">${'abcd'[k]}) <s>${rich(o)}</s></button>`;
      let cl = 'opt';
      if (shown) {
        if (k === q.c) cl += ' ok';
        else if (k === ans) cl += ' ko';
      } else if (k === ans) cl += ' sel';
      return `<button class="${cl}" role="radio" aria-checked="${k === ans}" data-xopt="${k}"${shown ? ' disabled' : ''}>${'abcd'[k]}) ${rich(o)}</button>`;
    })
    .join('')}</div>
  <div aria-live="polite">${shown ? `<div class="exp">${ans === q.c ? '<b>¡Correcto!</b> ' : '<b>No era esa.</b> La buena es la ' + 'abcd'[q.c] + '). '}${rich(q.exp || '')}</div>` : ''}</div>
  <div class="xact"><button class="mini${X.dud[X.i] ? ' hi' : ''}" data-act="xdud" aria-pressed="${!!X.dud[X.i]}">${X.dud[X.i] ? '★ Dudosa' : '☆ Marcar dudosa'}</button>${X.pistas && !shown && hid == null ? `<button class="mini" data-act="xpis">💡 Pista</button>` : ''}${ans != null && !shown ? `<button class="mini ghost" data-act="xclr">Dejar en blanco</button>` : ''}</div>
  <div class="xnav"><button class="btn ghost" data-act="xprev"${X.i ? '' : ' disabled'}>‹ Anterior</button>${X.i + 1 < X.items.length ? `<button class="btn" data-act="xnext">Siguiente ›</button>` : `<button class="btn" data-act="xfin">Entregar</button>`}</div>
  </section><aside class="xside"><h3>Preguntas</h3><div class="xgrid">${grid}</div><p class="fine">Morado: respondida · ★: dudosa</p><button class="btn ${X.conf ? '' : 'ghost'}" data-act="xfin">${X.conf ? '¿Seguro? Pulsa otra vez para entregar' : 'Entregar examen'}</button>${(() => {
    const n = Object.keys(X.ans).length;
    return n && n < X.items.length
      ? `<button class="btn ghost" data-act="xparcial">Corregir solo las ${n} respondidas</button>`
      : '';
  })()} <button class="mini ghost" data-act="xquit">Salir sin guardar</button></aside></div></div>`;
}
function vExamEnd() {
  const X = ui.ex;
  const R = X.secsR,
    D = X.secsD;
  const nd = Object.keys(X.dud).length;
  const cards = X.secs
    .map(
      (s, si) =>
        `<div class="kpi"><b style="color:${R[si].nota >= 5 ? 'var(--ok)' : 'var(--bad)'}">${n1(R[si].nota)}</b><span>${esc(s.titulo)}<br>${R[si].a} bien · ${R[si].f} mal · ${R[si].b} en blanco</span>${nd ? `<small class="fine">Sin contestar las dudosas: ${n1(D[si].nota)}</small>` : ''}</div>`,
    )
    .join('');
  const L = X.items
    .map((it, i) => ({ it, i, v: X.ans[i] }))
    .filter(
      (x) =>
        X.filt === 'todas' ||
        (X.filt === 'fallos' && x.v != null && x.v !== x.it.q.c) ||
        (X.filt === 'dudosas' && X.dud[x.i]) ||
        (X.filt === 'blanco' && x.v == null),
    );
  const f = (k, t, n) =>
    `<button class="chip2${X.filt === k ? ' on' : ''}" data-xf="${k}" aria-pressed="${X.filt === k}">${t} <b>${n}</b></button>`;
  const cnt = {
    fallos: X.items.filter((it, i) => X.ans[i] != null && X.ans[i] !== it.q.c).length,
    dudosas: nd,
    blanco: X.items.filter((it, i) => X.ans[i] == null).length,
    todas: X.items.length,
  };
  let tip = '';
  if (nd) {
    const g = D.reduce((a, d, i) => a + d.nota - R[i].nota, 0);
    tip = `<p class="tipbox">${g > 0.05 ? `💡 Si hubieras dejado en blanco las ${nd} preguntas dudosas, habrías sacado <b>más nota</b>. Cuando dudes de verdad, mejor en blanco.` : g < -0.05 ? `💪 Arriesgar en tus dudosas te salió bien: acertaste la mayoría.` : `Arriesgar o no en tus dudosas te habría dado lo mismo.`}</p>`;
  }
  return `<div class="study wide"><h2>${esc(X.titulo)}</h2><p class="sub">Nota sobre 10 en cada parte, con la penalización del examen (cada fallo resta un tercio).${Object.keys(X.pis).length ? ` Usaste ${Object.keys(X.pis).length} pistas.` : ''}</p><div class="kpis">${cards}</div>${vCorte(X)}${vNivelResultado(X)}${tip}
  <div class="chips" role="group" aria-label="Qué preguntas ver">${f('fallos', 'Fallos', cnt.fallos)}${f('dudosas', '★ Dudosas', cnt.dudosas)}${f('blanco', 'En blanco', cnt.blanco)}${f('todas', 'Todas', cnt.todas)}</div>
  <div class="list">${
    L.map((x) => {
      const q = x.it.q;
      return `<div class="row"><div class="t"><b>${x.i + 1}. ${rich(q.q)}</b><small>${x.v != null ? `Tu respuesta: ${'abcd'[x.v]}) ${rich(q.opts[x.v])} ${x.v === q.c ? '✓' : '✗'}<br>` : 'En blanco<br>'}Correcta: ${'abcd'[q.c]}) ${rich(q.opts[q.c])}${q.exp ? ' — ' + rich(q.exp) : ''}</small></div></div>`;
    }).join('') || '<p class="empty">Nada en esta lista.</p>'
  }</div>
  <p class="fine">Los fallos se han guardado en «Mis errores».</p><button class="btn" data-act="xquit">Volver a exámenes</button></div>`;
}
function vExCfg() {
  const c = ui.xcfg;
  const seg = (name, opts, val) =>
    `<div class="seg seg-s">${opts.map(([v, t, d]) => `<label><input type="radio" name="${name}" value="${v}"${v === val ? ' checked' : ''}><span><b>${t}</b>${d ? `<small>${d}</small>` : ''}</span></label>`).join('')}</div>`;
  const ts = S.temas.slice().sort(ordT);
  return `<form class="card xcfg" data-xcfg="1"><h3>${esc(c.titulo)}</h3>
  ${
    c.kind === 'sim'
      ? `<div class="fld"><label for="xb">Bloque</label><select id="xb" name="bloque"><option value="">Todos los bloques</option>${['I', 'II', 'III', 'IV'].map((b) => `<option value="${b}"${c.bloque === b ? ' selected' : ''}>Bloque ${b} · ${esc(BL[b].n)}</option>`).join('')}</select></div>
  <div class="fld"><label for="xtm">Tema (opcional)</label><select id="xtm" name="tema"><option value="">Todos los temas del bloque</option>${ts.map((t) => `<option value="${t.id}"${c.tema === t.id ? ' selected' : ''}>${esc(t.codigo + ' · ' + t.titulo)}</option>`).join('')}</select></div>
  <div class="fld"><span class="lbl">Número de preguntas</span>${seg(
    'n',
    [
      [10, '10'],
      [20, '20'],
      [40, '40'],
      [80, '80'],
    ],
    c.n || 20,
  )}</div>
  <div class="fld"><span class="lbl">Preguntas</span>${seg('fuente', [['todas', 'Web + oficiales', ''], ['ofi', 'Solo oficiales', ''], ...(S.grupo ? [['grupo', 'Solo del grupo', 'Drive']] : [])], c.fuente || 'todas')}</div>`
      : ''
  }
  ${
    c.kind !== 'sim'
      ? `<div class="fld"><span class="lbl">Segunda parte (supuesto práctico)</span>${seg(
          'sup',
          [
            ['III', 'Supuesto de desarrollo', 'Bloque III (II+III en 2026)'],
            ['IV', 'Supuesto de sistemas', 'Bloque IV (II+IV en 2026)'],
            ['no', 'Sin supuesto', 'solo 1.ª parte'],
          ],
          c.sup || supDe(),
        )}</div>`
      : ''
  }
  <div class="fld"><span class="lbl">Corrección</span>${seg(
    'modo',
    [
      ['final', 'Al final', 'como el examen'],
      ['momento', 'Según respondo', 'ves si aciertas'],
    ],
    c.modo || 'final',
  )}</div>
  <div class="fld"><span class="lbl">Tiempo</span>${seg(
    'tiempo',
    [
      ['oficial', 'Con reloj', '1,2 min por pregunta'],
      ['libre', 'Sin límite', ''],
    ],
    c.tiempo || 'oficial',
  )}</div>
  <div class="fld"><span class="lbl">Pistas</span>${seg(
    'pistas',
    [
      ['no', 'Sin pistas', ''],
      ['si', 'Con pistas', 'descarta una opción mala'],
    ],
    c.pistas || 'no',
  )}</div>
  <div class="acts"><button class="btn">Empezar</button><button type="button" class="btn ghost" data-act="xcancel">Cancelar</button></div></form>`;
}
function vGrupo() {
  const G = S.grupo || [];
  const per = {};
  G.forEach((q) => {
    const k = q.tema || q.bloque;
    per[k] = (per[k] || 0) + 1;
  });
  const files = [...new Set(G.map((q) => q.file))];
  return `<p class="sub">${G.length} preguntas de los tests del grupo PreparaTAI (Drive). Muchas son de exámenes de 2004–2017: puede haber leyes ya cambiadas, así que fíate más de las oficiales recientes. Solo las ves tú.</p>
  ${['I', 'II', 'III', 'IV']
    .map(
      (b) =>
        `<div class="ofib"><b>Bloque ${b}</b><div class="chips wrap">${S.temas
          .filter((t) => t.bloque === b)
          .sort(ordT)
          .map((t) =>
            per[t.id]
              ? `<button class="chip2" data-act="xgru" data-t="${t.id}">${esc(t.codigo)} <b>${per[t.id]}</b></button>`
              : '',
          )
          .join(
            '',
          )}<button class="chip2" data-act="xgru" data-b="${b}">Todo el bloque <b>${G.filter((q) => q.bloque === b).length}</b></button></div></div>`,
    )
    .join('')}
  <details class="mes nocap" style="margin-top:14px"><summary>Por archivo del Drive</summary><div class="chips wrap" style="padding:0 12px 12px">${files.map((f) => `<button class="chip2" data-act="xgru" data-f="${esc(f)}">${esc(f)} <b>${G.filter((q) => q.file === f).length}</b></button>`).join('')}</div></details>`;
}
function vSupuestos() {
  const ex = idxOrder()
    .map((m) => S.exams[m.id])
    .filter(Boolean);
  const mio = supDe();
  const partes = ex.flatMap((e) => e.partes.filter((p) => p.id !== 'p1').map((p) => ({ e, p })));
  partes.sort((a, b) => ((b.p.bloques || [])[0] === mio) - ((a.p.bloques || [])[0] === mio));
  return `<p class="sub">Practica solo la segunda parte, con su enunciado y 24 minutos. Tu supuesto es el de los <b>${esc(supTxt(mio))}</b>: salen primero los del Bloque ${mio} de años anteriores (antes el supuesto era solo del III o del IV, pero te sirven igual para entrenar).</p><div class="xlist">${partes.map(({ e, p }) => `<div class="card xe"><b>${esc(p.titulo)} · Bloque ${esc((p.bloques || [])[0] || '')}</b><small>${esc(e.titulo)}</small><p class="fine" style="margin:4px 0">${esc((p.enunciado || '').slice(0, 140))}…</p><div class="acts"><button class="btn${(p.bloques || [])[0] === mio ? '' : ' ghost'}" data-act="xsup" data-id="${esc(e.id)}" data-p="${p.id}">Hacer supuesto</button></div></div>`).join('')}</div>`;
}
function vExamenesHub(tab) {
  if (tab === 'gru') return vGrupo();
  if (tab === 'sup') return vSupuestos();
  if (tab === 'niv') return vNivel();
  const ofi = ofiQs(true);
  const per = {};
  ofi.forEach((q) => {
    const k = q.tema || q.bloque;
    per[k] = (per[k] || 0) + 1;
  });
  const exs = idxOrder().filter((m) => S.exams[m.id]);
  if (tab === 'ofi')
    return `<p class="sub">Tal cual salieron, con la plantilla oficial de respuestas. Ojo: hasta 2025 el supuesto era del Bloque III o del IV; en 2026 es II+III o II+IV.</p>
  <div class="xlist">${
    exs
      .map((m) => {
        const e = S.exams[m.id];
        const r = S.res.filter((x) => x.titulo === e.titulo);
        const best = r.length ? Math.max(...r.map(nota)) : null;
        return `<div class="card xe"><b>${esc(e.titulo)}</b><small>${e.partes[0].preguntas.length} + 20 preguntas · plantilla ${esc(e.plantilla.split(' ')[0])}${best != null ? ' · mejor nota ' + n1(best) : ''}</small><div class="acts"><button class="btn" data-act="xcfg" data-k="oficial" data-id="${esc(e.id)}">Hacer examen</button><a class="mini ghost" href="${esc(e.fuente)}" target="_blank" rel="noopener">PDF oficial</a></div></div>`;
      })
      .join('') || '<p class="empty">Cargando exámenes…</p>'
  }</div>
`;
  if (tab === 'sim')
    return `${vSemanal()}<p class="sub">Mezclan preguntas de exámenes oficiales y de la web.</p><div class="modes">
   <button class="mode" data-act="xcfg" data-k="gen"><b>Examen completo</b><span>80 preguntas repartidas por bloques, como el real, más un supuesto práctico. Se mezclan preguntas oficiales y de la web.</span></button>
   <button class="mode" data-act="xcfg" data-k="sim"><b>A tu medida</b><span>Eliges bloque o tema, cuántas preguntas, tiempo, pistas y cuándo corregir.</span></button></div>`;
  return `<p class="sub">${ofi.length} preguntas de la primera parte de ${exs.length} exámenes, clasificadas por tema de forma automática (puede haber alguna mal colocada). Toca uno para practicarlo.</p>
  ${['I', 'II', 'III', 'IV']
    .map(
      (b) =>
        `<div class="ofib"><b>Bloque ${b}</b><div class="chips wrap">${S.temas
          .filter((t) => t.bloque === b)
          .sort(ordT)
          .map((t) =>
            per[t.id]
              ? `<button class="chip2" data-act="xofi" data-t="${t.id}">${esc(t.codigo)} <b>${per[t.id]}</b></button>`
              : '',
          )
          .join(
            '',
          )}<button class="chip2" data-act="xofi" data-b="${b}">Todo el bloque <b>${ofi.filter((q) => q.bloque === b).length}</b></button></div></div>`,
    )
    .join('')}`;
}
