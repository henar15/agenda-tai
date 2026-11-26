/**
 * Simulacro semanal: un examen completo (80 preguntas + tu supuesto) que cambia cada lunes,
 * comparado con la nota de corte de convocatorias anteriores.
 */

// Puntuación directa mínima (aciertos − fallos/3) para aprobar cada parte. Fuente: OpositaTest.
const CORTES = [
  { oep: '2025', p1: 24, p2: 9.6 },
  { oep: '2019', p1: 25, p2: 8 },
];
const supDe = () => ((S.config || {}).supuesto === 'IV' ? 'IV' : 'III');
const supTxt = (s) => (s === 'IV' ? 'Bloques II+IV' : 'Bloques II+III');

// Aleatorio con semilla: el simulacro de una semana es siempre el mismo
function rngSemilla(txt) {
  let h = 1779033703 ^ txt.length;
  for (const ch of txt) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
function barajarCon(a, rnd) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function semanalHecho(sem) {
  return S.res.filter((r) => r.testId === 'ex-semanal' && r.sem === (sem || monday())).pop() || null;
}

function startSemanal() {
  const sem = monday();
  const rnd = rngSemilla('semanal-' + sem + '-' + supDe());
  const pool = barajarCon(ofiQs(true).concat(ownQs()), rnd);
  const quiero = { I: 22, II: 15, III: 21, IV: 22 },
    vistos = new Set(),
    p1 = [];
  ['I', 'II', 'III', 'IV'].forEach((b) =>
    pool
      .filter((q) => q.bloque === b)
      .forEach((q) => {
        const k = plain(q.q).slice(0, 60);
        if (quiero[b] > 0 && !vistos.has(k)) {
          vistos.add(k);
          p1.push(q);
          quiero[b]--;
        }
      }),
  );
  const secs = [{ titulo: 'Primera parte', qs: p1 }];
  const sups = [];
  idxOrder().forEach((m) => {
    const e = S.exams[m.id];
    if (e) e.partes.forEach((p) => (p.bloques || [])[0] === supDe() && sups.push({ e, p }));
  });
  if (sups.length) {
    const n = Math.floor(rnd() * sups.length);
    const { e, p } = sups[n];
    secs.push({
      titulo: 'Segunda parte · Supuesto (' + yearOf(e) + ')',
      enun: p.enunciado,
      qs: p.preguntas
        .filter((q) => !q.anulada && q.c >= 0)
        .map((q) => Object.assign({}, q, { id: e.id + ':' + q.id, src: e.titulo })),
    });
  }
  startExam({
    kind: 'semanal',
    titulo: 'Simulacro semanal · ' + fmtD(sem),
    secs,
    sem,
    modo: 'final',
    tiempo: 'oficial',
    pistas: 'no',
  });
}

// Puntuación directa de una parte: aciertos − fallos/3
const netas = (r) => Math.round((r.a - r.f / 3) * 100) / 100;

function vCorte(X) {
  const R = X.secsR;
  if (!R || !X.secs[0] || X.secs[0].qs.length < 60) return '';
  const n1p = netas(R[0]),
    n2p = R[1] ? netas(R[1]) : null;
  const c = CORTES[0];
  const ok1 = n1p >= c.p1,
    ok2 = n2p == null || n2p >= c.p2;
  return `<div class="card corte"><h3>${ok1 && ok2 ? '🎉 Habrías pasado el corte' : '📏 Frente a la nota de corte'}</h3>
  <div class="kpis"><div class="kpi"><b style="color:${ok1 ? 'var(--ok)' : 'var(--bad)'}">${n1(n1p)}</b><span>1.ª parte (corte ${esc(c.oep)}: ${n1(c.p1)})</span></div>${
    n2p != null
      ? `<div class="kpi"><b style="color:${ok2 ? 'var(--ok)' : 'var(--bad)'}">${n1(n2p)}</b><span>Supuesto (corte ${esc(c.oep)}: ${n1(c.p2)})</span></div>`
      : ''
  }</div>
  <p class="fine">Puntuación directa: aciertos − fallos/3. Cortes de turno libre: ${CORTES.map((x) => `OEP ${x.oep} → ${n1(x.p1)} y ${n1(x.p2)}`).join(' · ')} (fuente: OpositaTest). Las plazas de cada año mueven el corte, así que tómalo como referencia.</p></div>`;
}

function vSemanal(compact) {
  const hecho = semanalHecho();
  const hist = S.res
    .filter((r) => r.testId === 'ex-semanal' && r.netas)
    .slice(-6)
    .map(
      (r) =>
        `<li><span>${esc(fmtD(r.sem))}</span><b>${n1(r.netas[0])}</b>${r.netas[1] != null ? ` · <b>${n1(r.netas[1])}</b>` : ''}</li>`,
    )
    .join('');
  return `<div class="card semanal"><h3>🎯 Simulacro semanal <small>· ${esc(supTxt(supDe()))}</small></h3>${
    hecho
      ? `<p>Hecho esta semana: <b>${n1(hecho.netas ? hecho.netas[0] : 0)}</b> en la 1.ª parte${hecho.netas && hecho.netas[1] != null ? ` y <b>${n1(hecho.netas[1])}</b> en el supuesto` : ''} (corte ${CORTES[0].oep}: ${n1(CORTES[0].p1)} y ${n1(CORTES[0].p2)}). El lunes sale uno nuevo.</p>`
      : `<p>Un examen completo como el real: 80 preguntas + tu supuesto, 120 minutos. Cambia cada lunes y te dice si habrías pasado el corte.</p><button class="btn" data-act="semanal">Empezar (2 h)</button>`
  }${!compact && hist ? `<p class="fine" style="margin-top:12px">Tus últimas semanas (1.ª parte · supuesto):</p><ul class="semhist">${hist}</ul>` : ''}</div>`;
}
