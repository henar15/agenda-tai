/**
 * Temario (34 temas) y esquemas visuales.
 */
function bestTest(tid) {
  const r = S.res.filter((x) => x.tema === tid);
  return r.length ? Math.max(...r.map(nota)) : null;
}
function cardPct(tid) {
  const cs = S.cards[tid] || [];
  const p = S.piles[tid] || {};
  const s = cs.filter((c) => p[c.id] === 3).length;
  return cs.length ? { n: cs.length, s } : null;
}
function rowTema(t) {
  const b = BL[t.bloque] || BL.I;
  const cp = cardPct(t.id),
    bt = bestTest(t.id),
    nq = bank(t.id).length;
  const ped = (S.pedidos || {})[t.id];
  const pedTxt = ped
    ? Date.now() - ped < 90 * 60000
      ? 'Generando… listas en 1 h aprox.'
      : 'En cola: se generan cuando tu ordenador esté encendido'
    : '';
  const acts = `<div class="acts">${cp ? `<button class="mini" data-act="goCards" data-id="${esc(t.id)}">Tarjetas (${cp.n})</button>` : ped ? `<span class="mini done">⏳ ${esc(pedTxt)}</span>` : `<button class="mini hi" data-act="pedir" data-id="${esc(t.id)}">Generar tarjetas</button>`}${nq ? `<button class="mini" data-act="goTest" data-id="${esc(t.id)}">Test</button>` : ''}${S.esq[t.id] ? `<button class="mini" data-act="esq" data-id="${esc(t.id)}">🗺️ Esquema</button>` : ''}</div>`;
  return `<div class="row trow"><span class="tag" style="background:${b.c}">${esc(t.codigo)}</span><div class="t"><b>${esc(t.titulo)}</b><small>${t.semana ? 'Semana del ' + esc(fmtD(t.semana)) : ''}${cp ? ' · ' + cp.s + '/' + cp.n + ' tarjetas sabidas' : ''}${nq ? ' · ' + nq + ' preguntas' : ''}${bt !== null ? ' · mejor nota ' + n1(bt) : ''}</small>${acts}</div><button class="pill p-${esc(t.estado || 'pendiente')}" data-act="estado" data-id="${esc(t.id)}" aria-label="Cambiar estado">${ESTN[t.estado] || 'Pendiente'}</button></div>`;
}
function vTemario() {
  if (!S.temas.length) return '<p class="empty">Todavía no hay temas cargados.</p>';
  const ped = Object.keys(S.pedidos || {}).filter((k) => S.pedidos[k] && !(S.cards[k] || []).length);
  const rec =
    Array.isArray(S.recursos) && S.recursos.length
      ? `<section class="blk recs"><h3>📎 Recursos extra <small>· solo los ves tú</small></h3>${S.recursos.map((g) => `<div class="card"><b>${esc(g.g)}</b>${g.d ? `<p class="fine" style="margin:4px 0 8px">${esc(g.d)}</p>` : ''}<div class="rlist">${(g.items || []).map((it) => (/^https:\/\//.test(it.u) ? `<a href="${esc(it.u)}" target="_blank" rel="noopener"><b>${esc(it.t)}</b>${it.d ? `<small>${esc(it.d)}</small>` : ''}</a>` : '')).join('')}</div></div>`).join('')}</section>`
      : '';
  return (
    `<h2>Temario: 34 temas</h2><p class="sub">Tarjetas y test de cada tema. Si un tema no tiene, pulsa «Generar tarjetas» y en un rato aparecen solas.</p>${ped.length ? `<div class="warn"><span style="flex:1">Generando tarjetas de: <b>${ped.map((k) => esc(k.replace('-', '.'))).join(', ')}</b>. Tardan alrededor de 1 hora; vuelve a abrir la web para verlas.</span></div>` : ''}` +
    ['I', 'II', 'III', 'IV']
      .map((b) => {
        const ts = S.temas.filter((t) => t.bloque === b).sort(ordT);
        return `<section class="blk"><h3><span class="tag" style="background:${BL[b].c}">Bloque ${b}</span>${esc(BL[b].n)}</h3><div class="list">${ts.map(rowTema).join('')}</div></section>`;
      })
      .join('') +
    rec +
    (ui.esq ? vEsquema(ui.esq) : '')
  );
}

/* ---------- esquemas ---------- */
async function loadEsq() {
  await Promise.all(
    S.temasBase
      .filter((t) => t.esquema)
      .map(async (t) => {
        const e = await getJ(`data/temas/${t.id}.esquema.json`);
        if (e) S.esq[t.id] = e;
      }),
  );
}
function vEsquema(id) {
  const e = S.esq[id],
    t = S.temas.find((x) => x.id === id);
  if (!e || !t) return '';
  const cols = ['#7c3aed', '#0d9488', '#2563eb', '#ea580c', '#db2777', '#65a30d', '#0891b2'];
  return `<div class="esq-wrap" role="dialog" aria-modal="true" aria-labelledby="esqt"><div class="esq"><div class="esq-top"><h2 id="esqt">🗺️ ${esc(t.codigo)} · ${esc(t.titulo)}</h2><button class="mini ghost" data-act="esqclose" aria-label="Cerrar esquema">✕</button></div>
  <div class="esq-center" style="--c:${BL[t.bloque].hex}">${esc(t.titulo)}</div><div class="esq-ramas">${e.ramas.map((r, i) => `<section class="rama" style="--c:${cols[i % cols.length]}"><h3><span aria-hidden="true">${esc(r.e || '•')}</span> ${esc(r.t)}</h3><ul>${r.items.map((x) => `<li>${rich(x)}</li>`).join('')}</ul></section>`).join('')}</div></div></div>`;
}
