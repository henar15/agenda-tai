/**
 * Gestión de clics y teclado (data-act).
 */
/* ---------- acciones ---------- */
function markPile(n) {
  const list = deckCards();
  const c = list[ui.idx];
  if (!c) return;
  const id = c.mz;
  const piles = Object.assign({}, S.piles[id] || {});
  piles[c.id] = n;
  S.piles = Object.assign({}, S.piles, { [id]: piles });
  ui.flip = false;
  srsMark(id, c.id, n);
  memMark(c.id, id, 'c', n === 3 ? 3 : n === 2 ? 2 : 1);
  kvSet('mem');
  statAdd('c', 1);
  if (
    ui.filtro === 'todas' ||
    ui.filtro === 'tipica' ||
    (ui.filtro === 'hoy' && n === 3) ||
    String(n) === ui.filtro
  )
    ui.idx++;
  kvSet('piles');
  logAct(1);
  render();
}
function recordErr(q, right) {
  statTema(q.tema, right);
  const items = Object.assign({}, S.err.items || {});
  const k = q.id || hash(q.q);
  const cur = items[k];
  if (!right && q.opts && !q._rit) {
    memMark(k, q.tema, 'q', 1);
    kvSet('mem');
  }
  if (right) {
    if (!cur) return false;
    const racha = (cur.racha || 0) + 1;
    if (racha >= 2) delete items[k];
    else items[k] = Object.assign({}, cur, { racha });
  } else
    items[k] = {
      q: q.q,
      opts: q.opts,
      c: q.c,
      exp: q.exp || '',
      tema: q.tema || '',
      tipico: !!q.tipico,
      fallos: ((cur && cur.fallos) || 0) + 1,
      racha: 0,
    };
  S.err = { items };
  return true;
}
async function finishTest() {
  const T = ui.test;
  let a = 0,
    f = 0,
    b = 0,
    ch = false;
  {
    let sg = (S.rec || {}).acSeg || 0,
      mx = (S.rec || {}).acMax || 0;
    T.t.preguntas.forEach((q, i) => {
      if (T.ans[i] === q.c) {
        sg++;
        mx = Math.max(mx, sg);
      } else sg = 0;
    });
    S.rec = Object.assign({}, S.rec, { acSeg: sg, acMax: mx });
    kvSet('records');
  }
  T.t.preguntas.forEach((q, i) => {
    const x = T.ans[i];
    if (x === undefined || x === null) b++;
    else if (x === q.c) {
      a++;
      if (recordErr(q, true)) ch = true;
    } else {
      f++;
      recordErr(q, false);
      ch = true;
    }
  });
  if (ch) kvSet('errores');
  T.r = {
    testId: T.t.id,
    titulo: T.t.titulo,
    tema: T.t.tema || '',
    aciertos: a,
    fallos: f,
    blanco: b,
    total: T.t.preguntas.length,
    fecha: new Date().toISOString(),
  };
  T.done = true;
  render();
  S.res = S.res.concat([T.r]);
  kvSet('resultados');
  statAdd('q', T.t.preguntas.length);
  logAct(T.t.preguntas.length);
  T.saved = true;
  render();
}
let vfTimer = null;
function vfTick() {
  const G = ui.game;
  if (!G || G.kind !== 'vf' || G.over) {
    clearInterval(vfTimer);
    return;
  }
  const left = Math.ceil((G.end - Date.now()) / 1000);
  if (left <= 0) {
    G.over = true;
    clearInterval(vfTimer);
    if (G.ok) logAct(G.ok);
    const rec = S.rec || {};
    if (G.ok > (rec.vf || 0)) {
      G.rec = true;
      S.rec = Object.assign({}, rec, { vf: G.ok });
      kvSet('records');
    }
    render();
  } else {
    const el = $('#gt');
    if (el) el.textContent = left + ' s';
    const tb = document.querySelector('.tbar i');
    if (tb) tb.style.width = Math.max(0, (G.end - Date.now()) / 600) + '%';
  }
}
function startVF(scope) {
  const pool = poolAll();
  if (!pool.length) return;
  ui.game = { kind: 'vf', scope, pool, ok: 0, ko: 0, miss: [], end: Date.now() + 60000 };
  vfNext();
  clearInterval(vfTimer);
  vfTimer = setInterval(vfTick, 250);
  render();
}
function setGScope(v) {
  ui.gscope = v || '';
  lsSet('gscope', ui.gscope);
  render();
}
function startEmp(mazo) {
  ui.game = { kind: 'emp', mazo };
  empNew();
  render();
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act],[data-pile],[data-opt],#flip,[data-ml],[data-mr]');
  if (!el) return;
  if (el.id === 'flip') {
    ui.flip = !ui.flip;
    el.classList.toggle('on', ui.flip);
    el.querySelector('.face.f').setAttribute('aria-hidden', ui.flip);
    el.querySelector('.face.b').setAttribute('aria-hidden', !ui.flip);
    el.setAttribute(
      'aria-label',
      ui.flip ? 'Respuesta. Pulsa para volver a la pregunta' : 'Pregunta. Pulsa para ver la respuesta',
    );
    return;
  }
  if (el.dataset.pile) {
    markPile(+el.dataset.pile);
    return;
  }
  if (el.dataset.opt !== undefined) {
    const T = ui.test;
    if (T.shown[T.i]) return;
    T.ans[T.i] = +el.dataset.opt;
    render();
    return;
  }
  if (el.dataset.ml !== undefined) {
    const G = ui.game;
    G.sel = el.dataset.ml;
    G.bad = null;
    render();
    return;
  }
  if (el.dataset.mr !== undefined) {
    const G = ui.game;
    if (!G.sel) return;
    const r = el.dataset.mr;
    if (r === G.sel) {
      G.done.add(r);
      G.sel = null;
      if (G.done.size === G.cards.length) {
        G.over = true;
        logAct(G.cards.length);
        G.secs = (Date.now() - G.t0) / 1000 + G.errs * 3;
        const rec = S.rec || {};
        if (!rec.emp || G.secs < rec.emp) {
          G.rec = true;
          S.rec = Object.assign({}, rec, { emp: G.secs });
          kvSet('records');
        }
      }
    } else {
      G.errs++;
      G.bad = 'r' + r;
    }
    render();
    return;
  }
  const a = el.dataset.act,
    T = ui.test,
    G = ui.game;
  if (a === 'estado') {
    const t = S.temas.find((x) => x.id === el.dataset.id);
    if (!t) return;
    t.estado = EST[(EST.indexOf(t.estado || 'pendiente') + 1) % 3];
    S.estados = Object.assign({}, S.estados, { [t.id]: t.estado });
    kvSet('estados');
    render();
  } else if (a === 'inscrita') {
    S.config = Object.assign({}, S.config, { inscrita: true });
    kvSet('config');
    render();
  } else if (a === 'next') {
    ui.idx++;
    ui.flip = false;
    render();
  } else if (a === 'prev') {
    ui.idx = Math.max(0, ui.idx - 1);
    ui.flip = false;
    render();
  } else if (a === 'login') {
    login();
  } else if (a === 'goCards') {
    ui.mazo = el.dataset.id;
    ui.idx = 0;
    ui.filtro = 'todas';
    location.hash = 'tarjetas';
  } else if (a === 'goTest') {
    ui.scope = el.dataset.id;
    const qs = shuffle(bank(ui.scope));
    const t = S.temas.find((x) => x.id === ui.scope);
    startRun('Práctica · Tema ' + (t ? t.codigo : ''), ui.scope, qs.slice(0, 10), 'practica-' + ui.scope);
  } else if (a === 'pedir') {
    const id = el.dataset.id;
    if (!fs || !uid) {
      flash('Entra con Google (arriba a la derecha) para pedir tarjetas');
      return;
    }
    el.disabled = true;
    fs.collection('pedidos')
      .doc(id)
      .set({ t: Date.now() })
      .then(() => {
        S.pedidos = Object.assign({}, S.pedidos, { [id]: Date.now() });
        render();
        flash('¡Pedido! Las tarjetas estarán en 1 hora aprox.');
      })
      .catch(() => {
        el.disabled = false;
        flash('No se pudo hacer el pedido');
      });
  } else if (a === 'logout') {
    auth && auth.signOut().then(() => location.reload());
  } else if (a === 'xcfg') {
    const k = el.dataset.k;
    const e = S.exams[el.dataset.id];
    ui.xcfg = {
      kind: k,
      id: el.dataset.id,
      titulo:
        k === 'oficial' ? e.titulo : k === 'gen' ? 'Examen completo (simulacro)' : 'Simulacro a tu medida',
    };
    render();
    scrollTo(0, 0);
  } else if (a === 'pomo') {
    pomoStart();
    render();
  } else if (a === 'pomostop') {
    pomoStop();
    render();
  } else if (a === 'pomomin') {
    if (ui.pomo) {
      ui.pomo.min = true;
      pomoDraw();
    }
  } else if (a === 'pomomax') {
    if (ui.pomo) {
      ui.pomo.min = false;
      pomoDraw();
    }
  } else if (a === 'dgo') {
    const g = el.dataset.go,
      t = el.dataset.t;
    if (g === 'cards') {
      ui.mazo = t;
      ui.idx = 0;
      ui.filtro = 'nueva';
      location.hash = 'tarjetas';
    } else if (g === 'repaso' || g === 'ritmo') {
      ui.ttab = 'ritmo';
      location.hash = 'tarjetas';
    } else if (g === 'errores') {
      const b = document.createElement('button');
      b.dataset.act = 'merr';
      location.hash = 'tests';
      setTimeout(() => {
        const x = document.querySelector('[data-act="merr"]');
        if (x) x.click();
      }, 50);
    } else if (g === 'test') {
      ui.scope = t;
      const qs = shuffle(bank(t));
      if (qs.length) startRun('Test de la semana · Tema ' + temaName(t), t, qs.slice(0, 15), 'practica-' + t);
      else location.hash = 'tests';
    } else if (g === 'sim') {
      ui.xtab = 'sim';
      location.hash = 'tests';
    } else if (g === 'semanal') {
      startSemanal();
    } else if (g === 'temas') location.hash = 'temario';
  } else if (a === 'xcancel') {
    ui.xcfg = null;
    render();
  } else if (a === 'xgru') {
    const t = el.dataset.t,
      b = el.dataset.b,
      f = el.dataset.f;
    let pool = (S.grupo || [])
      .filter((q) => (t ? q.tema === t : b ? q.bloque === b : q.file === f))
      .map((q) => Object.assign({}, q, { id: 'grupo:' + q.id }));
    pool = shuffle(pool).slice(0, 40);
    ui.ex = null;
    if (pool.length) {
      const secs = [{ titulo: 'Tests del grupo', qs: pool }];
      ui.ex = {
        titulo: 'Tests del grupo · ' + (t ? 'Tema ' + temaName(t) : b ? 'Bloque ' + b : f),
        kind: 'grupo',
        secs,
        items: pool.map((q) => ({ q, s: 0 })),
        i: 0,
        ans: {},
        dud: {},
        pis: {},
        shown: {},
        modo: 'momento',
        pistas: false,
        end: null,
        t0: Date.now(),
        done: false,
        conf: false,
        filt: 'fallos',
      };
      render();
      scrollTo(0, 0);
    }
  } else if (a === 'xofi') {
    const t = el.dataset.t,
      b = el.dataset.b;
    startExam({
      kind: 'sim',
      titulo: 'Preguntas oficiales · ' + (t ? 'Tema ' + temaName(t) : 'Bloque ' + b),
      tema: t || '',
      bloque: t ? '' : b,
      n: 200,
      fuente: 'ofi',
      modo: 'momento',
      tiempo: 'libre',
      pistas: 'no',
    });
  } else if (a === 'xnext') {
    ui.ex.i++;
    ui.ex.conf = false;
    render();
    scrollTo(0, 0);
  } else if (a === 'xprev') {
    ui.ex.i--;
    ui.ex.conf = false;
    render();
    scrollTo(0, 0);
  } else if (a === 'xdud') {
    const X = ui.ex;
    if (X.dud[X.i]) delete X.dud[X.i];
    else X.dud[X.i] = 1;
    render();
  } else if (a === 'xpis') {
    const X = ui.ex;
    X.pis[X.i] = pista(X.items[X.i].q);
    if (X.ans[X.i] === X.pis[X.i]) delete X.ans[X.i];
    render();
  } else if (a === 'xclr') {
    delete ui.ex.ans[ui.ex.i];
    render();
  } else if (a === 'xfin') {
    const X = ui.ex;
    if (!X.conf && Object.keys(X.ans).length < X.items.length) {
      X.conf = true;
      render();
      return;
    }
    finishExam();
  } else if (a === 'xquit') {
    clearInterval(exTimer);
    ui.ex = null;
    render();
    scrollTo(0, 0);
  } else if (a === 'mascCfg') {
    ui.mcfg = !ui.mcfg;
    render();
  } else if (a === 'fsz') {
    const on = !document.documentElement.classList.contains('big');
    document.documentElement.classList.toggle('big', on);
    try {
      localStorage.setItem('agendaTAI:big', on ? '1' : '');
    } catch (e) {}
    el.setAttribute('aria-pressed', on);
  } else if (a === 'hedit') {
    ui.hedit = !ui.hedit;
    render();
  } else if (a === 'hplant') {
    plantilla();
    render();
  } else if (a === 'hdel') {
    const i = ui.hdia == null ? hoyIdx() : ui.hdia;
    const bl = bloquesDia(i).slice();
    bl.splice(+el.dataset.i, 1);
    setDia(i, bl);
    render();
  } else if (a === 'hcopy') {
    const src = bloquesDia(+el.dataset.i);
    for (let k = 0; k < 5; k++)
      if (k !== +el.dataset.i)
        setDia(
          k,
          src.map((b) => Object.assign({}, b)),
        );
    flash('Copiado a lunes–viernes');
    render();
  } else if (a === 'tstart') {
    const t = S.tests.find((x) => x.id === el.dataset.id);
    if (t && (t.preguntas || []).length) {
      ui.test = {
        t: Object.assign({}, t, { preguntas: t.preguntas.map((q) => Object.assign({ tema: t.tema }, q)) }),
        i: 0,
        ans: {},
        shown: {},
      };
      render();
      scrollTo(0, 0);
    }
  } else if (a === 'merr') {
    startRun('Mis errores', '', shuffle(errList()), 'errores');
  } else if (a === 'mtip') {
    startRun('Típicas de examen', '', shuffle(bank().filter((q) => q.tipico)).slice(0, 30), 'tipicas');
  } else if (a === 'msim') {
    startRun('Simulacro', '', shuffle(bank()).slice(0, 40), 'simulacro');
  } else if (a === 'mtema' || a === 'mtemaall') {
    const qs = shuffle(bank(ui.scope));
    const t = S.temas.find((x) => x.id === ui.scope);
    startRun(
      'Práctica · Tema ' + (t ? t.codigo : ''),
      ui.scope,
      a === 'mtema' ? qs.slice(0, 10) : qs,
      'practica-' + ui.scope,
    );
  } else if (a === 'tquit') {
    ui.test = null;
    render();
  } else if (a === 'tcheck') {
    T.shown[T.i] = true;
    render();
  } else if (a === 'tblank') {
    T.ans[T.i] = null;
    T.shown[T.i] = true;
    render();
  } else if (a === 'tnext') {
    if (T.i + 1 < T.t.preguntas.length) {
      T.i++;
      render();
      scrollTo(0, 0);
    } else finishTest();
  } else if (a === 'gvf') {
    startVF(ui.gscope);
  } else if (a === 'gvfagain') {
    startVF(G.scope);
  } else if (a === 'gemp') {
    startEmp(ui.gscope);
  } else if (a === 'ritgo') {
    ui.ttab = 'ritmo';
    startRitmo(+el.dataset.n);
  } else if (a === 'hoyreset') {
    if (!ui.hoyReset) {
      ui.hoyReset = 1;
      render();
      return;
    }
    ui.hoyReset = 0;
    reiniciarHoy();
    render();
  } else if (a === 'ritnose') {
    const R = ui.rit;
    ritEvaluar(R.cola[R.i], 'nose', Date.now() - (R.t0 || Date.now()));
    render();
  } else if (a === 'ritopt') {
    const R = ui.rit,
      x = R.cola[R.i],
      q = memFind(x.id, x.k, x.t);
    R.sel = +el.dataset.i;
    ritEvaluar(x, R.sel === q.c ? 'ok' : 'mal', Date.now() - (R.t0 || Date.now()));
    render();
  } else if (a === 'ritoverride') {
    // «Lo había puesto bien con otras palabras»: cuenta como acierto a medias
    Object.assign(ui.rit.pend, {
      ok: true,
      parcial: false,
      nota: 2,
      conf: 'dudo',
      hc: false,
      override: true,
    });
    render();
  } else if (a === 'ritnext') {
    const R = ui.rit;
    ritCommit();
    R.t0 = 0;
    R.t1 = 0;
    R.i++;
    R.paso = 'q';
    R.sel = null;
    R.conf = null;
    if (R.i % 5 === 0) ritSave();
    render();
    const b = document.querySelector('#ritin') || document.querySelector('.rit .opt');
    if (b) b.focus();
  } else if (a === 'ritfin') {
    if (ui.rit && ui.rit.pend) ritCommit();
    if (ui.rit) ritSave();
    ui.rit = null;
    render();
  } else if (a === 'ttab') {
    ui.ttab = el.dataset.v;
    render();
  } else if (a === 'semanal') {
    startSemanal();
  } else if (a === 'supcfg') {
    S.config = Object.assign({}, S.config, { supuesto: supDe() === 'III' ? 'IV' : 'III' });
    kvSet('config');
    render();
  } else if (a === 'estud') {
    const v = el.dataset.v,
      est = ((S.config || {}).estudios || []).slice();
    const i = est.indexOf(v);
    if (i >= 0) est.splice(i, 1);
    else est.push(v);
    S.config = Object.assign({}, S.config, { estudios: est });
    kvSet('config');
    render();
  } else if (a === 'nivgen') {
    startNivel();
  } else if (a === 'nivtema') {
    startNivel(el.dataset.id);
  } else if (a === 'nivdom') {
    const id = el.dataset.id,
      temas = Object.assign({}, (S.nivel || {}).temas);
    temas[id] = Object.assign({ p: null, n: 0, f: today() }, temas[id], { dom: !dominado(id), manual: true });
    S.nivel = Object.assign({}, S.nivel, { temas });
    kvSet('nivel');
    render();
  } else if (a === 'esqprint') {
    imprimirEsquemas([el.dataset.id]);
  } else if (a === 'esqprintall') {
    imprimirEsquemas(Object.keys(S.esq));
  } else if (a === 'gscope') {
    setGScope(el.dataset.v);
  } else if (a === 'gnew' || a === 'gagain') {
    startGame(el.dataset.k);
  } else if (a === 'gmqnext') {
    const G = ui.game;
    G.i++;
    G.a = null;
    G.pa = null;
    render();
    scrollTo(0, 0);
  } else if (a === 'glincheck') {
    const G = ui.game;
    G.done = true;
    const sorted = G.ev.slice().sort((x, y) => x.y - y.y);
    if (G.orden.every((x, i) => G.ev[x].y === sorted[i].y)) {
      G.ok++;
      logAct(3);
    }
    render();
  } else if (a === 'glinnext') {
    const ev = buildLin();
    Object.assign(ui.game, { ev, orden: [], done: false, ronda: ui.game.ronda + 1 });
    render();
  } else if (a === 'practT') {
    const t = el.dataset.t;
    const qs = shuffle(bank(t).concat(ofiQs(true).filter((q) => q.tema === t)));
    if (qs.length) startRun('Refuerzo · Tema ' + temaName(t), t, qs.slice(0, 15), 'refuerzo-' + t);
  } else if (a === 'esq') {
    ui.esq = el.dataset.id;
    render();
  } else if (a === 'esqclose') {
    ui.esq = null;
    render();
  } else if (a === 'xsup') {
    const e = S.exams[el.dataset.id];
    const p = e && e.partes.find((x) => x.id === el.dataset.p);
    if (p) {
      ui.ex = null;
      const qs = p.preguntas
        .filter((q) => !q.anulada && q.c >= 0)
        .map((q) => Object.assign({}, q, { id: e.id + ':' + q.id }));
      const mins = Math.round(qs.length * 1.2);
      ui.ex = {
        titulo: p.titulo + ' · ' + e.titulo,
        kind: 'oficial',
        secs: [
          { titulo: p.titulo + ' (Bloque ' + ((p.bloques || [])[0] || '') + ')', enun: p.enunciado, qs },
        ],
        items: qs.map((q) => ({ q, s: 0 })),
        i: 0,
        ans: {},
        dud: {},
        pis: {},
        shown: {},
        modo: 'final',
        pistas: false,
        end: Date.now() + mins * 60000,
        mins,
        t0: Date.now(),
        done: false,
        conf: false,
        filt: 'fallos',
      };
      clearInterval(exTimer);
      exTimer = setInterval(exTick, 1000);
      render();
      scrollTo(0, 0);
    }
  } else if (a === 'install') {
    if (window._bip) {
      window._bip.prompt();
      window._bip = null;
      render();
    }
  } else if (a === 'gcf' || a === 'gcfagain') {
    const mz = ui.gscope;
    ui.game = { kind: 'cf', mazo: mz, items: cfBuild(mz), i: 0, ok: 0, a: null };
    render();
    scrollTo(0, 0);
  } else if (a === 'gcfnext') {
    const G = ui.game;
    G.i++;
    G.a = null;
    if (G.i >= G.items.length) {
      G.over = true;
      logAct(G.ok);
      statAdd('q', G.items.length);
      const rec = S.rec || {};
      if (G.ok > (rec.cf || 0)) {
        G.rec = true;
        S.rec = Object.assign({}, rec, { cf: G.ok });
        kvSet('records');
      }
    }
    render();
  } else if (a === 'gempagain') {
    startEmp(G.mazo);
  } else if (a === 'gquit') {
    clearInterval(vfTimer);
    ui.game = null;
    render();
  } else if (a === 'vfv' || a === 'vff') {
    const said = a === 'vfv',
      c = G.cur;
    const right = said === c.truth;
    if (right) {
      G.ok++;
      G.fb = '<b>¡Bien!</b>';
    } else {
      G.ko++;
      G.end -= 5000;
      G.miss.push(c.q);
      G.fb = '<b>No.</b> La buena es: ' + rich(c.q.opts[c.q.c]);
    }
    const fb = G.fb;
    vfNext();
    G.fb = fb;
    render();
  }
});
// momento en que empiezas a escribir: mide lo que tardas en recordar, no en teclear
document.addEventListener('input', (e) => {
  if (e.target.id === 'ritin' && ui.rit && !ui.rit.t1) ui.rit.t1 = Date.now();
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-ritform]');
  if (!f || !ui.rit) return;
  e.preventDefault();
  const R = ui.rit,
    x = R.cola[R.i],
    c = memFind(x.id, x.k, x.t);
  const txt = f.querySelector('textarea').value.trim();
  if (!txt) {
    f.querySelector('textarea').focus();
    return;
  }
  const res = corregir(txt, c.a);
  ritEvaluar(
    x,
    res.score >= 0.75 ? 'ok' : res.score >= 0.4 ? 'casi' : 'mal',
    (R.t1 || Date.now()) - (R.t0 || Date.now()),
    {
      txt,
      claves: res.claves,
    },
  );
  render();
  const b = document.querySelector('[data-act="ritnext"]');
  if (b) b.focus();
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-mcfg]');
  if (!f) return;
  e.preventDefault();
  const n = (f.n.value || '').trim().slice(0, 16) || 'Pipo';
  const m = +((f.querySelector('input[name=m]:checked') || {}).value || 20);
  S.config = Object.assign({}, S.config, {
    masc: n,
    meta: m,
    descanso: [...f.querySelectorAll('input[name=dd]:checked')].map((x) => +x.value),
  });
  kvSet('config');
  ui.mcfg = false;
  render();
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-hform]');
  if (!f) return;
  e.preventDefault();
  const i = +f.dataset.hform;
  const b = {
    h: f.h.value,
    f: f.f.value,
    t: f.t.value.trim().slice(0, 40),
    tipo: HT[f.tipo.value] ? f.tipo.value : 'libre',
  };
  if (!b.h || !b.t) return;
  setDia(i, bloquesDia(i).concat([b]));
  render();
});
document.addEventListener('click', (e) => {
  const d = e.target.closest('#dflip,[data-dcard],[data-dopt],[data-dnext],[data-dreset]');
  if (!d || !ui.demo) return;
  const D = ui.demo;
  if (d.id === 'dflip') {
    D.flip = !D.flip;
    d.classList.toggle('on', D.flip);
    d.querySelector('.face.f').setAttribute('aria-hidden', D.flip);
    d.querySelector('.face.b').setAttribute('aria-hidden', !D.flip);
    return;
  }
  if (d.dataset.dcard) {
    D.i = (D.i + +d.dataset.dcard + 5) % 5;
    D.flip = false;
  } else if (d.dataset.dopt != null) {
    D.ans[D.q] = +d.dataset.dopt;
  } else if (d.dataset.dnext) {
    D.q++;
  } else if (d.dataset.dreset) {
    D.q = 0;
    D.ans = [];
  }
  const y = scrollY;
  render();
  scrollTo(0, y);
});
document.addEventListener('click', (e) => {
  const o = e.target.closest('[data-xopt],[data-xgo],[data-xf]');
  if (!o || !ui.ex) return;
  const X = ui.ex;
  if (o.dataset.xopt != null) {
    if (X.modo === 'momento' && X.ans[X.i] != null) return;
    X.ans[X.i] = +o.dataset.xopt;
    X.conf = false;
  } else if (o.dataset.xgo != null) {
    X.i = +o.dataset.xgo;
    X.conf = false;
    scrollTo(0, 0);
  } else X.filt = o.dataset.xf;
  render();
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-xcfg]');
  if (!f) return;
  e.preventDefault();
  const v = (n) => {
    const el = f.querySelector(`[name="${n}"]:checked`) || f.querySelector(`[name="${n}"]`);
    return el ? el.value : '';
  };
  const c = Object.assign({}, ui.xcfg, {
    sup: v('sup'),
    modo: v('modo'),
    tiempo: v('tiempo'),
    pistas: v('pistas'),
    bloque: v('bloque'),
    tema: v('tema'),
    n: +v('n') || 20,
    fuente: v('fuente'),
  });
  if (c.kind === 'sim' && c.tema) c.titulo = 'Simulacro · Tema ' + temaName(c.tema);
  else if (c.kind === 'sim' && c.bloque) c.titulo = 'Simulacro · Bloque ' + c.bloque;
  startExam(c);
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-mq],[data-lad],[data-lrm]');
  const G = ui.game;
  if (!b || !G) return;
  if (b.dataset.mq != null && G.kind === 'mcq' && G.a == null) {
    G.a = +b.dataset.mq;
    const it = G.items[G.i];
    const ok = G.a === it.c;
    ok ? G.ok++ : G.ko++;
    if (it.raw) recordErr(it.raw, ok);
    if (G.sub === 'sur' && !ok) G.vidas--;
    if (G.sub === 'duel') {
      G.pa = Math.random() < G.pp;
      if (G.pa) G.pipo++;
    }
    render();
  } else if (b.dataset.lad != null && G.kind === 'lin' && !G.done) {
    G.orden.push(+b.dataset.lad);
    render();
  } else if (b.dataset.lrm != null && G.kind === 'lin' && !G.done) {
    G.orden.splice(+b.dataset.lrm, 1);
    render();
  }
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-cf]');
  if (b && ui.game && ui.game.kind === 'cf' && ui.game.a == null) {
    const G = ui.game;
    G.a = +b.dataset.cf;
    if (G.items[G.i].opts[G.a] === G.items[G.i].ans) G.ok++;
    render();
  }
});
document.addEventListener('click', (e) => {
  const p = e.target.closest('[data-ptab]');
  if (p) {
    ui.ptab = p.dataset.ptab;
    render();
  }
});
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-xtab]');
  if (t) {
    ui.xtab = t.dataset.xtab;
    ui.xcfg = null;
    render();
  }
});
document.addEventListener('click', (e) => {
  const f = e.target.closest('[data-filtro]');
  if (f) {
    ui.filtro = f.dataset.filtro;
    ui.idx = 0;
    ui.flip = false;
    render();
  }
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-hdia]');
  if (b) {
    ui.hdia = +b.dataset.hdia;
    render();
  }
});
{
  let sx = null,
    sy = null;
  document.addEventListener(
    'touchstart',
    (e) => {
      if (e.target.closest('#flip')) {
        sx = e.touches[0].clientX;
        sy = e.touches[0].clientY;
      }
    },
    { passive: true },
  );
  document.addEventListener('touchend', (e) => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx,
      dy = e.changedTouches[0].clientY - sy;
    sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const b = document.querySelector(`[data-act="${dx < 0 ? 'next' : 'prev'}"]`);
      if (b) {
        e.preventDefault();
        b.click();
      }
    }
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && ui.pomo && !ui.pomo.min) {
    ui.pomo.min = true;
    pomoDraw();
  }
});
document.addEventListener('keydown', (e) => {
  if (location.hash === '#tarjetas' && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) {
    const k = {
      ArrowRight: '[data-act="next"]',
      ArrowLeft: '[data-act="prev"]',
      1: '[data-pile="1"]',
      2: '[data-pile="2"]',
      3: '[data-pile="3"]',
    }[e.key];
    if (k) {
      const b = document.querySelector(k);
      if (b) {
        e.preventDefault();
        b.click();
        return;
      }
    }
  }
});
document.addEventListener('keydown', (e) => {
  const f = e.target.closest && e.target.closest('#flip,#dflip');
  if (f && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    f.click();
  }
});
document.addEventListener('change', (e) => {
  const dk = e.target.dataset && e.target.dataset.dk;
  if (dk) {
    const d = Object.assign({}, S.diario || {});
    const t = Object.assign({}, d[today()] || {});
    if (e.target.checked) {
      t[dk] = 1;
      logAct(2);
      const m = dk.match(/^l-(.+)-(\d+)$/);
      if (m) {
        const tt = S.temas.find((x) => x.id === m[1]);
        const prevp = (S.lectura || {})[m[1]] || ((tt && tt.pagIni) || 1) - 1;
        statAdd('p', Math.max(0, +m[2] - prevp));
        t['_prev:' + m[1]] = t['_prev:' + m[1]] != null ? t['_prev:' + m[1]] : prevp;
        S.lectura = Object.assign({}, S.lectura, { [m[1]]: +m[2] });
        kvSet('lectura');
      }
    } else {
      delete t[dk];
      // desmarcar una lectura devuelve las páginas a como estaban
      const m = dk.match(/^l-(.+)-(\d+)$/);
      if (m && t['_prev:' + m[1]] != null) {
        S.lectura = Object.assign({}, S.lectura, { [m[1]]: t['_prev:' + m[1]] });
        delete t['_prev:' + m[1]];
        kvSet('lectura');
      }
    }
    d[today()] = t;
    const ks = Object.keys(d).sort();
    while (ks.length > 40) delete d[ks.shift()];
    S.diario = d;
    kvSet('diario');
    render();
    return;
  }
});
document.addEventListener('change', (e) => {
  if (e.target.dataset && e.target.dataset.task) {
    const k = e.target.dataset.task;
    const h = Object.assign({}, (S.planHecho || {}).h || {});
    if (e.target.checked) {
      h[k] = true;
      logAct(1);
    } else delete h[k];
    S.planHecho = { h };
    kvSet('planHecho');
    render();
    return;
  }
  const id = e.target.id;
  if (id === 'mazo') {
    ui.mazo = e.target.value;
    ui.idx = 0;
    ui.flip = false;
    render();
  } else if (id === 'filtro') {
    ui.filtro = e.target.value;
    ui.idx = 0;
    ui.flip = false;
    render();
  } else if (id === 'scope') {
    ui.scope = e.target.value;
    render();
  } else if (id === 'gscope-tema') {
    setGScope(e.target.value);
  }
});
