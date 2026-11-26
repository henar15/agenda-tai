/**
 * Juegos: V/F, Empareja, Completa la frase, ¿Qué artículo es?, Línea temporal, Supervivencia y Duelo.
 */
/* ---------- de qué se juega: todo, un bloque o un tema ---------- */
// ui.gscope: '' = todo el temario · 'B:II' = un bloque · 'II-3' = un tema
const temaBloque = (id) => (S.temas.find((t) => t.id === id) || {}).bloque || (id ? id.split('-')[0] : null);
function enScope(tema, bloque) {
  const sc = ui.gscope || '';
  if (!sc) return true;
  if (sc.startsWith('B:')) return (bloque || temaBloque(tema)) === sc.slice(2);
  return tema === sc;
}
const allCards = () =>
  Object.keys(S.cards)
    .filter((t) => enScope(t))
    .flatMap((t) => temaCards(t));
function poolAll() {
  return bank()
    .concat(ofiQs(true))
    .concat((S.grupo || []).map((q) => Object.assign({}, q, { id: 'grupo:' + q.id })))
    .filter((q) => enScope(q.tema, q.bloque));
}
function scopeLabel() {
  const sc = ui.gscope || '';
  if (!sc) return 'todo el temario';
  if (sc.startsWith('B:')) return 'el Bloque ' + sc.slice(2);
  const t = S.temas.find((x) => x.id === sc);
  return t ? 'el tema ' + t.codigo : sc;
}
const deScope = () => ('de ' + scopeLabel()).replace(/^de el /, 'del ');
function vScope() {
  const sc = ui.gscope || '';
  const nc = allCards().length,
    nq = poolAll().length;
  const temas = S.temas.filter((t) => (S.cards[t.id] || []).length || bank(t.id).length).sort(ordT);
  const chip = (v, l) =>
    `<button class="chip2${sc === v ? ' on' : ''}" data-act="gscope" data-v="${esc(v)}" aria-pressed="${sc === v}">${l}</button>`;
  return `<section class="card gscope" aria-label="De qué quieres jugar">
    <h3>🎯 ¿De qué quieres jugar?</h3>
    <div class="chips">${chip('', 'Todo')}${['I', 'II', 'III', 'IV'].map((b) => chip('B:' + b, 'Bloque ' + b)).join('')}</div>
    <label class="picker"><select id="gscope-tema" aria-label="Un tema concreto">
      <option value="">…o elige un tema</option>${temas.map((t) => `<option value="${esc(t.id)}"${sc === t.id ? ' selected' : ''}>${esc(t.codigo + ' · ' + t.titulo)}</option>`).join('')}
    </select></label>
    <p class="sub">Jugando con <b>${esc(scopeLabel())}</b>: ${nc} tarjetas y ${nq} preguntas.</p>
  </section>`;
}
function buildArt() {
  const re =
    /\*\*\s*(?:art(?:ículo|\.|s\.)?)\s*(\d{1,3}(?:\.\d)?)\s*\*\*|\b(?:art(?:ículo|\.|s\.))\s*\*\*(\d{1,3})\*\*|\bart(?:ículo|\.)\s*(\d{1,3})\b/i;
  const items = allCards()
    .map((c) => {
      const m = c.a.match(re);
      if (!m) return null;
      const n = m[1] || m[2] || m[3];
      if (new RegExp('\\b' + n + '\\b').test(c.q)) return null;
      return { c, n };
    })
    .filter(Boolean);
  const nums = [...new Set(items.map((x) => x.n))];
  return shuffle(items)
    .slice(0, 10)
    .map(({ c, n }) => {
      const near = nums
        .filter((x) => x !== n)
        .sort((a, b) => Math.abs(a - n) - Math.abs(b - n))
        .slice(0, 6);
      const opts = shuffle([n, ...shuffle(near).slice(0, 3)]);
      while (opts.length < 4) opts.push(String(+n + opts.length * 3));
      const txt = c.a.replace(new RegExp(n.replace('.', '\\.'), 'g'), '___');
      return {
        q: `<small class="fine">${esc(plain(c.q))}</small><br>${rich(txt)}<br><b>¿Qué artículo es?</b>`,
        opts: opts.map((x) => 'Art. ' + x),
        c: opts.indexOf(n),
      };
    });
}
function buildLin() {
  const ev = allCards()
    .map((c) => {
      const m = plain(c.a).match(/\b(19[5-9]\d|20[0-3]\d)\b/);
      return m ? { t: plain(c.q).replace(/^¿|\?$/g, ''), y: +m[1] } : null;
    })
    .filter(Boolean);
  const by = {};
  ev.forEach((e) => {
    if (!by[e.y]) by[e.y] = e;
  });
  const ys = shuffle(Object.values(by)).slice(0, 5);
  return ys;
}
function mcqItems(n, pool) {
  return shuffle(pool)
    .slice(0, n)
    .map((q) => ({ q: rich(q.q), opts: q.opts.map((o) => rich(o)), c: q.c, raw: q }));
}
function startGame(kind, mazo) {
  const r = R();
  if (kind === 'art') {
    const it = buildArt();
    if (it.length < 3) {
      flash('Aún no hay tarjetas con artículos suficientes');
      return;
    }
    ui.game = {
      kind: 'mcq',
      sub: 'art',
      titulo: '¿Qué artículo es?',
      items: it,
      i: 0,
      ok: 0,
      ko: 0,
      a: null,
    };
  } else if (kind === 'lin') {
    const ev = buildLin();
    if (ev.length < 4) {
      flash('Faltan fechas en las tarjetas');
      return;
    }
    ui.game = { kind: 'lin', ev, orden: [], done: false, ronda: 1, ok: 0 };
  } else if (kind === 'sur') {
    const pool = shuffle(poolAll());
    const tip = pool.filter((q) => q.tipico),
      rest = pool.filter((q) => !q.tipico);
    ui.game = {
      kind: 'mcq',
      sub: 'sur',
      titulo: 'Supervivencia',
      items: mcqItems(300, []).concat(
        tip
          .concat(rest)
          .slice(0, 300)
          .map((q) => ({ q: rich(q.q), opts: q.opts.map((o) => rich(o)), c: q.c, raw: q })),
      ),
      i: 0,
      ok: 0,
      ko: 0,
      vidas: 3,
      a: null,
    };
  } else if (kind === 'duel') {
    const p = Math.min(0.85, 0.45 + 0.05 * etapa(r.n));
    ui.game = {
      kind: 'mcq',
      sub: 'duel',
      titulo: 'Duelo con ' + mascName(),
      items: mcqItems(10, poolAll()),
      i: 0,
      ok: 0,
      ko: 0,
      pipo: 0,
      pp: p,
      pa: null,
      a: null,
    };
  }
  render();
  scrollTo(0, 0);
}
function vMCQ() {
  const G = ui.game;
  const fin = G.sub === 'sur' ? G.vidas <= 0 || G.i >= G.items.length : G.i >= G.items.length;
  if (fin) {
    if (!G.saved) {
      G.saved = true;
      logAct(G.ok);
      statAdd('q', G.ok + G.ko);
      const rec = Object.assign({}, S.rec || {});
      const k = { art: 'art', sur: 'sur', duel: 'duelw' }[G.sub];
      if (G.sub === 'duel') {
        if (G.ok > G.pipo) rec.duelw = (rec.duelw || 0) + 1;
      } else if (G.ok > (rec[k] || 0)) {
        rec[k] = G.ok;
        G.rec = true;
      }
      S.rec = rec;
      kvSet('records');
    }
    const msg =
      G.sub === 'duel'
        ? G.ok > G.pipo
          ? `¡Le has ganado a ${esc(mascName())}! 🏆`
          : G.ok === G.pipo
            ? '¡Empate!'
            : `${esc(mascName())} gana esta vez… ¡revancha!`
        : G.sub === 'sur'
          ? `Has aguantado ${G.ok} preguntas${G.rec ? ' · ¡nuevo récord!' : ''}`
          : `${G.ok}/${G.items.length} aciertos${G.rec ? ' · ¡nuevo récord!' : ''}`;
    return `<div class="study game"><h2>${esc(G.titulo)}</h2><div class="card" style="text-align:center">${G.sub === 'duel' ? `<div class="duelres"><div><b>${G.ok}</b><small>Tú</small></div><div>${mascSVG(etapa(R().n), null, G.ok >= G.pipo ? 'wait' : 'happy', 90, mascName())}<b>${G.pipo}</b><small>${esc(mascName())}</small></div></div>` : `<div class="big">${G.ok}</div>`}<p style="font-weight:800">${msg}</p></div><div style="display:flex;gap:10px"><button class="btn ghost" data-act="gquit">Salir</button><button class="btn" data-act="gagain" data-k="${G.sub}">Otra vez</button></div></div>`;
  }
  const it = G.items[G.i],
    a = G.a;
  const head =
    G.sub === 'sur'
      ? `${'❤️'.repeat(G.vidas)}${'🤍'.repeat(3 - G.vidas)} · ✓ ${G.ok}`
      : G.sub === 'duel'
        ? `Tú ${G.ok} – ${G.pipo} ${esc(mascName())}`
        : `${G.i + 1}/${G.items.length} · ✓ ${G.ok}`;
  return `<div class="study game"><div class="gtop"><button class="mini ghost" data-act="gquit">✕ Salir</button><span class="gok">${head}</span></div>
  ${G.sub === 'duel' ? `<div class="duelbar">${mascSVG(etapa(R().n), null, 'wait', 54, mascName())}<span>${G.pa == null ? esc(mascName()) + ' está pensando…' : G.pa ? esc(mascName()) + ' ha acertado' : esc(mascName()) + ' ha fallado 😅'}</span></div>` : ''}
  <div class="stmt"><div class="qtext" style="margin:0">${it.q}</div></div>
  <div class="cfopts" role="radiogroup" aria-label="Opciones">${it.opts.map((o, k) => `<button class="opt${a != null ? (k === it.c ? ' ok' : k === a ? ' ko' : '') : ''}" role="radio" aria-checked="${k === a}" data-mq="${k}"${a != null ? ' disabled' : ''}>${o}</button>`).join('')}</div>
  <div aria-live="polite">${a != null ? `<p class="exp">${a === it.c ? '<b>¡Bien!</b>' : '<b>No era esa.</b>'}${it.raw && it.raw.exp ? ' ' + rich(it.raw.exp) : ''}</p><button class="btn" data-act="gmqnext">Siguiente</button>` : ''}</div></div>`;
}
function vLin() {
  const G = ui.game;
  const sorted = G.ev.slice().sort((a, b) => a.y - b.y);
  const ok = G.done && G.orden.every((x, i) => G.ev[x].y === sorted[i].y);
  return `<div class="study game"><div class="gtop"><button class="mini ghost" data-act="gquit">✕ Salir</button><span class="gok">Ronda ${G.ronda} · ✓ ${G.ok}</span></div><h2 style="margin:0">Ordena de más antiguo a más reciente</h2><p class="fine">Toca los hechos en orden. Toca uno elegido para quitarlo.</p>
  <ol class="linsel">${G.orden.map((x, i) => `<li><button class="opt${G.done ? (G.ev[x].y === sorted[i].y ? ' ok' : ' ko') : ' sel'}" data-lrm="${i}"${G.done ? ' disabled' : ''}>${esc(G.ev[x].t)}${G.done ? ` <b>(${G.ev[x].y})</b>` : ''}</button></li>`).join('')}</ol>
  <div class="cfopts">${G.ev.map((e, k) => (G.orden.includes(k) ? '' : `<button class="opt" data-lad="${k}">${esc(e.t)}</button>`)).join('')}</div>
  ${G.done ? `<p class="exp">${ok ? '<b>¡Perfecto!</b>' : '<b>Casi.</b> El orden bueno: ' + sorted.map((e) => e.y).join(' → ')}</p><button class="btn" data-act="glinnext">Otra ronda</button>` : G.orden.length === G.ev.length ? '<button class="btn" data-act="glincheck">Comprobar</button>' : ''}</div>`;
}

/* ---------- juegos ---------- */
function cfBuild(mazo) {
  const cs = allCards().filter((c) => /\*\*(.+?)\*\*/.test(c.a));
  const terms = [
    ...new Set(cs.flatMap((c) => [...c.a.matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1].trim()))),
  ].filter((t) => t.length < 40);
  return shuffle(cs)
    .slice(0, 10)
    .map((c) => {
      const bs = [...c.a.matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1].trim()).filter((t) => t.length < 40);
      if (!bs.length) return null;
      const ans = bs[Math.floor(Math.random() * bs.length)];
      const sim = terms.filter((t) => t !== ans && /\d/.test(t) === /\d/.test(ans));
      const opts = shuffle([
        ans,
        ...shuffle(sim.length >= 3 ? sim : terms.filter((t) => t !== ans)).slice(0, 3),
      ]);
      return { c, ans, opts, txt: c.a.replace('**' + ans + '**', '<span class="hueco">_____</span>') };
    })
    .filter(Boolean);
}
function vCF() {
  const G = ui.game;
  if (G.i >= G.items.length) {
    return `<div class="study game"><h2>¡Hecho!</h2><div class="card" style="text-align:center"><div class="big">${G.ok}/${G.items.length}</div><p style="font-weight:800">frases completadas${G.rec ? ' · ¡nuevo récord!' : ''}</p></div><div style="display:flex;gap:10px"><button class="btn ghost" data-act="gquit">Salir</button><button class="btn" data-act="gcfagain">Otra ronda</button></div></div>`;
  }
  const it = G.items[G.i];
  const ans = G.a;
  return `<div class="study game"><div class="gtop"><button class="mini ghost" data-act="gquit">✕ Salir</button><span class="gok">${G.i + 1}/${G.items.length} · ✓ ${G.ok}</span></div>
  <div class="stmt"><small class="fine">${esc(plain(it.c.q))}</small><p class="cftxt">${esc(plain(it.txt.replace('<span class="hueco">_____</span>', '\u0000'))).replace('\u0000', '<span class="hueco">' + (ans != null ? esc(it.ans) : '_____') + '</span>')}</p></div>
  <div class="cfopts" role="radiogroup" aria-label="Elige la palabra que falta">${it.opts.map((o, k) => `<button class="opt${ans != null ? (o === it.ans ? ' ok' : k === ans ? ' ko' : '') : ''}" role="radio" aria-checked="${k === ans}" data-cf="${k}"${ans != null ? ' disabled' : ''}>${esc(o)}</button>`).join('')}</div>
  <div aria-live="polite">${ans != null ? `<p class="exp">${it.opts[ans] === it.ans ? '<b>¡Bien!</b>' : '<b>Era «' + esc(it.ans) + '».</b>'}</p><button class="btn" data-act="gcfnext">${G.i + 1 < G.items.length ? 'Siguiente' : 'Ver resultado'}</button>` : ''}</div></div>`;
}
function vJuegos() {
  const G = ui.game;
  if (ui.gscope == null) ui.gscope = lsGet('gscope') || '';
  if (G && G.kind === 'vf') return vVF();
  if (G && G.kind === 'emp') return vEmp();
  if (G && G.kind === 'cf') return vCF();
  if (G && G.kind === 'mcq') return vMCQ();
  if (G && G.kind === 'lin') return vLin();
  const rec = S.rec || {};
  const nc = allCards().length,
    nq = poolAll().length,
    nArt = buildArt().length,
    nLin = buildLin().length;
  const play = (act, ok, k, falta) =>
    ok
      ? `<button class="btn" data-act="${act}"${k ? ` data-k="${k}"` : ''}>Jugar</button>`
      : `<button class="btn" disabled>Jugar</button><p class="sub">${falta}</p>`;
  const sinT = 'Aún no hay tarjetas ' + esc(deScope()) + '.',
    sinP = 'Aún no hay preguntas ' + esc(deScope()) + '.';
  return `<h2>Juegos</h2><p class="sub">Para repasar jugando, en ratos cortos.</p>
  ${vScope()}
  <div class="grid">
   <div class="card"><h3>⚡ Verdadero o falso exprés</h3><p>60 segundos. Te enseño una pregunta con una respuesta: ¿es la buena? Cada fallo te quita 5 segundos.</p><p class="sub">Récord: <b>${rec.vf || 0}</b> aciertos</p>${play('gvf', nq, '', sinP)}</div>
   <div class="card"><h3>📜 ¿Qué artículo es?</h3><p>Te enseño lo que dice un artículo y eliges su número. Lo que más cae en el Bloque I.</p><p class="sub">Récord: <b>${rec.art || 0}</b>/10</p>${play('gnew', nArt >= 3, 'art', 'Este juego necesita tarjetas con artículos (sobre todo del Bloque I).')}</div>
   <div class="card"><h3>⏳ Línea temporal</h3><p>Ordena leyes y hechos de más antiguo a más reciente.</p>${play('gnew', nLin >= 4, 'lin', 'Este juego necesita tarjetas con fechas (sobre todo del Bloque I).')}</div>
   <div class="card"><h3>❤️ Supervivencia</h3><p>Preguntas seguidas hasta que falles 3. Primero las típicas; luego, más difíciles.</p><p class="sub">Récord: <b>${rec.sur || 0}</b> seguidas</p>${play('gnew', nq, 'sur', sinP)}</div>
   <div class="card"><h3>🥚 Duelo con ${esc(mascName())}</h3><p>10 preguntas: ${esc(mascName())} también responde. Cuanto más crece, mejor juega.</p><p class="sub">Victorias: <b>${rec.duelw || 0}</b></p>${play('gnew', nq, 'duel', sinP)}</div>
   <div class="card"><h3>✍️ Completa la frase</h3><p>Te enseño la respuesta de una tarjeta con un hueco en lo importante. Elige la palabra que falta. 10 frases por ronda.</p><p class="sub">Récord: <b>${rec.cf || 0}</b>/10</p>${play('gcf', nc, '', sinT)}</div>
   <div class="card"><h3>🧩 Empareja</h3><p>Une cada pregunta con su respuesta. 6 parejas por ronda, lo más rápido que puedas.</p><p class="sub">Récord: <b>${rec.emp ? n1(rec.emp) + ' s' : '–'}</b></p>${play('gemp', nc >= 6, '', sinT)}</div>
  </div>`;
}
function vfNext() {
  const G = ui.game;
  const q = G.pool[Math.floor(Math.random() * G.pool.length)];
  const truth = Math.random() < 0.5;
  let k = q.c;
  if (!truth) {
    const o = q.opts.map((_, i) => i).filter((i) => i !== q.c);
    k = o[Math.floor(Math.random() * o.length)];
  }
  G.cur = { q, k, truth: k === q.c };
  G.fb = '';
}
function vVF() {
  const G = ui.game;
  const left = Math.max(0, Math.ceil((G.end - Date.now()) / 1000));
  if (G.over)
    return `<div class="study"><h2>¡Tiempo!</h2><div class="card" style="text-align:center"><div class="big">${G.ok}</div><p style="font-weight:800">aciertos · ${G.ko} fallos${G.rec ? ' · ¡nuevo récord!' : ''}</p></div>${G.miss.length ? `<h3>Las que fallaste</h3><div class="list">${G.miss.map((x) => `<div class="row"><div class="t"><b>${rich(x.q)}</b><small>Correcta: ${rich(x.opts[x.c])}</small></div></div>`).join('')}</div>` : ''}<div style="display:flex;gap:10px"><button class="btn ghost" data-act="gquit">Salir</button><button class="btn" data-act="gvfagain">Otra vez</button></div></div>`;
  const c = G.cur;
  return `<div class="study game"><div class="gtop"><button class="mini ghost" data-act="gquit">✕ Salir</button><span class="gok">✓ ${G.ok}</span></div><div class="timer"><span id="gt">${left} s</span><div class="tbar" aria-hidden="true"><i style="width:${(left / 60) * 100}%"></i></div></div><div class="stmt"><small class="fine">¿Es correcta esta respuesta?</small>${rich(c.q.q)}<span class="o">${rich(c.q.opts[c.k])}</span></div>${G.fb ? `<div class="exp">${G.fb}</div>` : ''}<div class="vf"><button class="v" data-act="vfv">✓ Verdadero</button><button class="f" data-act="vff">✗ Falso</button></div></div>`;
}
function empNew() {
  const G = ui.game;
  const cs = shuffle(allCards()).slice(0, 6);
  G.cards = cs;
  G.left = shuffle(cs.map((c) => c.id));
  G.right = shuffle(cs.map((c) => c.id));
  G.done = new Set();
  G.sel = null;
  G.bad = null;
  G.errs = 0;
  G.t0 = Date.now();
  G.over = false;
}
function vEmp() {
  const G = ui.game;
  const by = (id) => G.cards.find((c) => c.id === id);
  if (G.over)
    return `<div class="study"><h2>¡Hecho!</h2><div class="card" style="text-align:center"><div class="big">${n1(G.secs)} s</div><p style="font-weight:800">${G.errs} errores${G.rec ? ' · ¡nuevo récord!' : ''}</p></div><div style="display:flex;gap:10px"><button class="btn ghost" data-act="gquit">Salir</button><button class="btn" data-act="gempagain">Otra ronda</button></div></div>`;
  return `<div class="study game"><div class="gtop"><button class="mini ghost" data-act="gquit">✕ Salir</button><span class="gok">${G.done.size} / ${G.cards.length}</span></div><p class="fine" style="margin:0">Toca una pregunta y luego su respuesta.</p><div class="match"><div class="mcol"><h3>Preguntas</h3>${G.left.map((id) => `<button class="${G.done.has(id) ? 'done' : G.sel === id ? 'sel' : G.bad === 'l' + id ? 'bad' : ''}" data-ml="${esc(id)}"${G.done.has(id) ? ' disabled' : ''}>${esc(plain(by(id).q))}</button>`).join('')}</div><div class="mcol"><h3>Respuestas</h3>${G.right.map((id) => `<button class="${G.done.has(id) ? 'done' : G.bad === 'r' + id ? 'bad' : ''}" data-mr="${esc(id)}"${G.done.has(id) ? ' disabled' : ''}>${esc(plain(by(id).a))}</button>`).join('')}</div></div></div>`;
}
