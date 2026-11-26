/**
 * Tarjetas con repaso espaciado (Leitner: 1, 3, 7, 14 y 30 días).
 */
/* ---------- repaso espaciado ---------- */
const SRS_INT = [1, 3, 7, 14, 30];
function srsDue(tema, c) {
  const s = ((S.srs || {})[tema] || {})[c.id];
  const p = (S.piles[tema] || {})[c.id];
  if (s) return s.d;
  if (p === 1 || p === 2) return today();
  return null;
}
function cardsDueHoy(tema) {
  const t = today();
  const ts = tema ? [tema] : Object.keys(S.cards);
  let n = 0;
  ts.forEach((tm) =>
    (S.cards[tm] || []).forEach((c) => {
      const d = srsDue(tm, c);
      if (d && d <= t) n++;
    }),
  );
  return n;
}
function srsMark(tema, id, pile) {
  const all = Object.assign({}, S.srs || {});
  const m = Object.assign({}, all[tema] || {});
  const prev = m[id] || { b: 0 };
  let b =
    pile === 3 ? Math.min(SRS_INT.length, prev.b + 1) : pile === 2 ? Math.max(1, Math.min(prev.b, 1)) : 0;
  const days = pile === 1 ? 1 : pile === 2 ? 2 : SRS_INT[b - 1];
  m[id] = { b, d: dkey(addD(new Date(), days)) };
  all[tema] = m;
  S.srs = all;
  kvSet('srs');
}

/* ---------- tarjetas ---------- */
function temaCards(tema) {
  const p = S.piles[tema] || {};
  return (S.cards[tema] || []).map((c) => Object.assign({}, c, { mz: tema, pile: p[c.id] || 0, t: !!c.t }));
}
function deckCards() {
  const t = today();
  return temaCards(ui.mazo).filter(
    (c) =>
      ui.filtro === 'todas' ||
      (ui.filtro === 'hoy' && (srsDue(ui.mazo, c) || '9') <= t) ||
      (ui.filtro === 'nueva' && !c.pile) ||
      (ui.filtro === 'tipica' && c.t) ||
      String(c.pile) === ui.filtro,
  );
}
function vTarjetas() {
  memSeed();
  const tab = ui.ttab || 'ritmo';
  const n = memDueCount();
  const tabs = ui.rit
    ? ''
    : `<h2>Repasar</h2><div class="ptabs" role="tablist">${[
        ['ritmo', `🧠 A tu ritmo${n ? ` (${n})` : ''}`],
        ['mazo', '🃏 Por tema'],
      ]
        .map(
          ([k, l]) =>
            `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-act="ttab" data-v="${k}">${l}</button>`,
        )
        .join('')}</div>`;
  return tabs + (tab === 'ritmo' ? vRitmo() : vMazos());
}
function vMazos() {
  if (!Object.keys(S.cards).length) return '<p class="empty">Aún no hay tarjetas.</p>';
  {
    const tc = temasConCartas();
    if (!tc.length) return '<p class="empty">Aún no hay tarjetas.</p>';
    if (!tc.find((t) => t.id === ui.mazo)) ui.mazo = tc[0].id;
  }
  const cs = temaCards(ui.mazo);
  const cnt = [0, 0, 0, 0];
  cs.forEach((c) => cnt[c.pile]++);
  const tot = cs.length || 1;
  const nt = cs.filter((c) => c.t).length;
  const list = deckCards();
  if (ui.idx >= list.length) ui.idx = 0;
  const c = list[ui.idx];
  const b = temaBl(ui.mazo);
  return `<div class="study tar"><div class="tside"><p class="sub hide-m">Toca la tarjeta para darle la vuelta y elige en qué montón va.</p>
  <div class="picker"><select id="mazo" aria-label="Tema">${temasConCartas()
    .map(
      (x) => `<option value="${esc(x.id)}"${x.id === ui.mazo ? ' selected' : ''}>${esc(x.titulo)}</option>`,
    )
    .join('')}</select>
  </div><div class="chips" role="group" aria-label="Qué tarjetas ver">${[['hoy', '📅 Toca hoy', cardsDueHoy(ui.mazo), ''], ['todas', 'Todas', cs.length, ''], ...(nt ? [['tipica', '⭐ Típicas', nt, '']] : []), ['nueva', 'Nuevas', cnt[0], ''], ['1', 'No me la sé', cnt[1], 'c1'], ['2', 'Dudo', cnt[2], 'c2'], ['3', 'Me la sé', cnt[3], 'c3']].map(([v, t, n, c]) => `<button class="chip2 ${c}${ui.filtro === v ? ' on' : ''}" data-filtro="${v}" aria-pressed="${ui.filtro === v}">${t} <b>${n}</b></button>`).join('')}</div>
  <div class="tbarw"><div class="stack3"><i style="width:${(cnt[3] / tot) * 100}%;background:#22c55e"></i><i style="width:${(cnt[2] / tot) * 100}%;background:#f59e0b"></i><i style="width:${(cnt[1] / tot) * 100}%;background:#ef4444"></i></div></div>
  </div><div class="tmain">${
    c
      ? `<div class="flip${ui.flip ? ' on' : ''}" id="flip" role="button" tabindex="0" aria-label="Girar tarjeta" style="--cc:${b.hex};--cl:${b.l}"><div class="fc"><div class="face f" aria-hidden="${!!ui.flip}">${c.t ? '<span class="tp">Típica de examen</span>' : ''}<span class="n" aria-hidden="true">${esc(c.n || '')}</span><div class="em" aria-hidden="true">${esc(c.e || '')}</div><div class="q">${rich(c.q)}</div><span class="hint">Toca para ver la respuesta</span></div><div class="face b" aria-hidden="${!ui.flip}"><span class="n" aria-hidden="true">${esc(c.n || '')}</span><div class="a">${rich(c.a)}</div>${c.h ? `<div class="h">${rich(c.h)}</div>` : ''}</div></div></div>
  <div class="cnav"><button class="nb" data-act="prev" aria-label="Tarjeta anterior">‹</button><span>${ui.idx + 1} / ${list.length}</span><button class="nb" data-act="next" aria-label="Tarjeta siguiente">›</button></div>
  <div class="piles"><button class="pl1" data-pile="1"><i aria-hidden="true">✗</i>No me la sé</button><button class="pl2" data-pile="2"><i aria-hidden="true">?</i>Dudo</button><button class="pl3" data-pile="3"><i aria-hidden="true">✓</i>Me la sé</button></div>`
      : '<p class="empty">No hay tarjetas en este montón.</p>'
  }</div></div>`;
}
