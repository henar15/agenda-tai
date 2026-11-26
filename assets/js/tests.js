/**
 * Tests por tema.
 */
/* ---------- tests ---------- */
function startRun(titulo, tema, preguntas, kind) {
  if (!preguntas.length) return;
  ui.test = { t: { id: kind, titulo, tema, preguntas }, kind, i: 0, ans: {}, shown: {}, t0: Date.now() };
  location.hash = 'tests';
  render();
  scrollTo(0, 0);
}
function vTests() {
  if (ui.ex) return vExam();
  const T = ui.test;
  if (T && T.done) return vTestEnd();
  if (T) {
    const q = T.t.preguntas[T.i];
    const ans = T.ans[T.i];
    const shown = T.shown[T.i];
    return `<div class="study"><div class="qhead"><span>${esc(T.t.titulo)}</span><span>${T.i + 1} / ${T.t.preguntas.length}</span></div>${q.tema && !T.t.tema ? `<div class="qhead"><span>${esc(temaName(q.tema))}</span></div>` : ''}<p class="qtext">${rich(q.q)}${q.tipico ? '<span class="tip">Típica</span>' : ''}</p>
    <div role="radiogroup" aria-label="Opciones">${q.opts
      .map((o, k) => {
        let cl = 'opt';
        if (shown) {
          if (k === q.c) cl += ' ok';
          else if (k === ans) cl += ' ko';
        } else if (k === ans) cl += ' sel';
        return `<button class="${cl}" role="radio" aria-checked="${k === ans}" data-opt="${k}"${shown ? ' disabled' : ''}>${'abcd'[k]}) ${rich(o)}</button>`;
      })
      .join('')}</div>
    <div aria-live="polite">${shown ? `<div class="exp">${ans === q.c ? '<b>¡Correcto!</b> ' : ans == null ? '<b>En blanco.</b> ' : '<b>No era esa.</b> '}${rich(q.exp || '')}</div>` : ''}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn ghost" data-act="tquit">Salir</button><span style="flex:1"></span>${shown ? `<button class="btn" data-act="tnext">${T.i + 1 < T.t.preguntas.length ? 'Siguiente' : 'Ver nota'}</button>` : `<button class="btn ghost" data-act="tblank">Dejar en blanco</button><button class="btn" data-act="tcheck"${ans === undefined ? ' disabled' : ''}>Comprobar</button>`}</div></div>`;
  }
  const all = bank(),
    tip = all.filter((q) => q.tipico),
    errs = errList(),
    ts = temasConBanco();
  if (!ui.scope || !ts.find((t) => t.id === ui.scope)) ui.scope = ts.length ? ts[0].id : '';
  const nScope = ui.scope ? bank(ui.scope).length : 0;
  const TB = [
    ['web', '✏️ Tests de la web', 'por tema'],
    ['ofi', '📄 Exámenes oficiales', 'completos'],
    ['pre', '🗂️ Preguntas oficiales', 'por tema'],
    ['sup', '📋 Supuestos', '2.ª parte'],
    ...(S.grupo ? [['gru', '👥 Tests del grupo', 'solo para ti']] : []),
    ['sim', '🎯 Simulacros', 'y el semanal'],
    ['niv', '🧭 Lo que ya sé', 'test de nivel'],
  ];
  const tabs = `<div class="xtabs" role="tablist">${TB.map(([k, t, d]) => `<button role="tab" aria-selected="${ui.xtab === k}" class="${ui.xtab === k ? 'on' : ''}" data-xtab="${k}"><b>${t}</b><small>${d}</small></button>`).join('')}</div>`;
  const head = `<h2>Exámenes y tests</h2><p class="sub">Cada fallo resta un tercio de acierto y las preguntas en blanco no restan. Lo que falles va a «Mis errores».</p><p class="supsel">Tu supuesto: <b>${esc(supTxt(supDe()))}</b> <button class="mini ghost" data-act="supcfg">Cambiar a ${esc(supTxt(supDe() === 'III' ? 'IV' : 'III'))}</button></p>${tabs}${ui.xcfg ? vExCfg() : ''}`;
  if (ui.xtab !== 'web') return head + vExamenesHub(ui.xtab);
  return (
    head +
    `<p class="sub">Preguntas hechas a partir de tus tarjetas, tema a tema. Cada pregunta se puede responder con lo que pone en las tarjetas.</p>
  <div class="modes">
   <button class="mode red" data-act="merr"${errs.length ? '' : ' disabled'}><b>Mis errores</b><span>Como en la autoescuela: salen de aquí cuando las aciertas 2 veces seguidas.</span><span class="cnt">${errs.length}</span></button>
   <button class="mode" data-act="mtip"${tip.length ? '' : ' disabled'}><b>Típicas de examen</b><span>Las preguntas que más caen, de todos los temas.</span><span class="cnt">${tip.length}</span></button>
   <button class="mode" data-act="msim"${all.length ? '' : ' disabled'}><b>Mezcla de la web</b><span>${Math.min(40, all.length)} preguntas al azar de todos los temas con tarjetas.</span><span class="cnt">${all.length}</span></button>
  </div>
  <div class="card" style="margin-bottom:28px"><h3>Practicar un tema</h3><div class="picker"><select id="scope" aria-label="Tema">${ts.map((t) => `<option value="${esc(t.id)}"${t.id === ui.scope ? ' selected' : ''}>${esc(t.codigo + ' · ' + t.titulo)}</option>`).join('')}</select><button class="btn" data-act="mtema"${nScope ? '' : ' disabled'}>10 preguntas al azar</button><button class="btn ghost" data-act="mtemaall"${nScope ? '' : ' disabled'}>Todas (${nScope})</button></div></div>
  ${
    S.tests.length
      ? `<h3>Tests guardados</h3><div class="list">${S.tests
          .slice()
          .sort((a, b) => (a.orden || 0) - (b.orden || 0))
          .map((t) => {
            const r = S.res.filter((x) => x.testId === t.id);
            const best = r.length ? Math.max(...r.map(nota)) : null;
            return `<div class="row"><div class="t"><b>${esc(t.titulo)}</b><small>${(t.preguntas || []).length} preguntas${r.length ? ' · hecho ' + r.length + (r.length > 1 ? ' veces' : ' vez') + ' · mejor nota ' + n1(best) : ' · sin hacer'}</small></div><button class="btn" data-act="tstart" data-id="${esc(t.id)}">${r.length ? 'Repetir' : 'Empezar'}</button></div>`;
          })
          .join('')}</div>`
      : ''
  }`
  );
}
function vTestEnd() {
  const T = ui.test,
    r = T.r;
  const n = nota(r);
  const fall = T.t.preguntas.map((q, i) => ({ q, i, a: T.ans[i] })).filter((x) => x.a !== x.q.c);
  return `<div class="study"><h2>${esc(T.t.titulo)}</h2><div class="card" style="text-align:center"><div class="big" style="color:${n >= 5 ? 'var(--ok)' : 'var(--bad)'}">${n1(n)}</div><p style="margin:6px 0 0;font-weight:800">${r.aciertos} aciertos · ${r.fallos} fallos · ${r.blanco} en blanco</p><p class="sub" style="margin:4px 0 0">${T.saved ? 'Guardado en tus resultados' : 'Guardando…'}${fall.length ? ' · los fallos están en «Mis errores»' : ''}</p></div>
  ${fall.length ? `<h3>Para repasar</h3><div class="list">${fall.map((x) => `<div class="row"><div class="t"><b>${rich(x.q.q)}</b><small>Correcta: ${rich(x.q.opts[x.q.c])}${x.q.exp ? ' — ' + rich(x.q.exp) : ''}</small></div></div>`).join('')}</div>` : '<p class="empty">¡Sin fallos!</p>'}
  <div style="display:flex;gap:10px"><button class="btn ghost" data-act="tquit">Volver a los tests</button></div></div>`;
}
