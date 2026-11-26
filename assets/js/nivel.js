/**
 * «Lo que ya sé»: estudios previos (DAM, DAW…) y test de nivel.
 * Los temas que ya dominas aligeran el plan (repaso rápido en vez de leer todo).
 */

// Temas que se suelen ver en cada estudio previo
const ESTUDIOS = {
  DAM: {
    n: 'DAM',
    d: 'Desarrollo de Aplicaciones Multiplataforma',
    temas: ['II-1', 'II-3', 'II-4', 'II-5', 'III-1', 'III-2', 'III-3', 'III-4', 'III-5', 'III-6', 'III-9'],
  },
  DAW: {
    n: 'DAW',
    d: 'Desarrollo de Aplicaciones Web',
    temas: ['II-5', 'III-1', 'III-2', 'III-3', 'III-4', 'III-6', 'III-7', 'III-8', 'III-9', 'IV-8'],
  },
  ASIR: {
    n: 'ASIR',
    d: 'Administración de Sistemas Informáticos en Red',
    temas: [
      'II-1',
      'II-2',
      'II-4',
      'II-5',
      'IV-1',
      'IV-2',
      'IV-3',
      'IV-4',
      'IV-5',
      'IV-6',
      'IV-7',
      'IV-8',
      'IV-9',
      'IV-10',
    ],
  },
  SMR: {
    n: 'SMR',
    d: 'Sistemas Microinformáticos y Redes',
    temas: ['II-1', 'II-2', 'II-4', 'IV-4', 'IV-6', 'IV-7', 'IV-10'],
  },
  ING: { n: 'Grado o ingeniería', d: 'Informática o telecomunicaciones', temas: null },
};

const nivelDe = (id) => ((S.nivel || {}).temas || {})[id] || null;
const dominado = (id) => {
  const n = nivelDe(id);
  return !!(n && n.dom);
};
function temasPorEstudios() {
  const est = (S.config || {}).estudios || [];
  const ids = new Set();
  est.forEach((k) => {
    const e = ESTUDIOS[k];
    if (!e) return;
    (e.temas || S.temas.filter((t) => t.bloque !== 'I').map((t) => t.id)).forEach((id) => ids.add(id));
  });
  return S.temas.filter((t) => ids.has(t.id)).sort(ordT);
}
function preguntasTema(id) {
  const seen = new Set();
  return bank(id)
    .concat(ofiQs(true).filter((q) => q.tema === id))
    .filter((q) => {
      const k = plain(q.q).slice(0, 60);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

function startNivel(temaId) {
  let qs = [];
  let titulo;
  if (temaId) {
    qs = shuffle(preguntasTema(temaId)).slice(0, 10);
    titulo = 'Lo que ya sé · Tema ' + temaName(temaId);
  } else {
    let ts = temasPorEstudios();
    if (!ts.length) ts = S.temas.filter((t) => t.bloque !== 'I').sort(ordT);
    ts.forEach((t) => {
      const p = preguntasTema(t.id);
      // primero las típicas: son las que «deberías acertar»
      const orden = shuffle(p.filter((q) => q.tipico)).concat(shuffle(p.filter((q) => !q.tipico)));
      qs = qs.concat(orden.slice(0, 4));
    });
    qs = qs.slice(0, 60);
    titulo = 'Lo que ya sé · Test general';
  }
  if (!qs.length) {
    flash('Aún no hay preguntas para ese test');
    return;
  }
  startExam({ kind: 'nivel', titulo, qs, modo: 'final', tiempo: 'libre', pistas: 'no' });
}

// Se llama al terminar un examen de tipo «nivel»
function guardarNivel(X) {
  const per = {};
  X.items.forEach((it, i) => {
    const t = it.q.tema;
    if (!t) return;
    const p = (per[t] = per[t] || { a: 0, n: 0 });
    p.n++;
    if (X.ans[i] === it.q.c) p.a++;
  });
  const temas = Object.assign({}, (S.nivel || {}).temas);
  Object.entries(per).forEach(([t, p]) => {
    const pct = Math.round((p.a / p.n) * 100);
    temas[t] = { p: pct, n: p.n, f: today(), dom: p.n >= 3 && pct >= 75 };
  });
  S.nivel = Object.assign({}, S.nivel, { temas });
  kvSet('nivel');
  X.nivel = per;
}

function etiquetaNivel(n) {
  if (!n) return '';
  if (n.dom) return '<span class="lvl ok">✅ Lo dominas</span>';
  if (n.p >= 50) return '<span class="lvl mid">🟡 Lo conoces</span>';
  return '<span class="lvl ko">📕 A estudiar</span>';
}

function vNivelResultado(X) {
  if (!X.nivel) return '';
  const rows = Object.entries(X.nivel)
    .map(([t, p]) => ({ t, p, n: nivelDe(t) }))
    .sort((a, b) => b.p.a / b.p.n - a.p.a / a.p.n);
  const dom = rows.filter((r) => r.n && r.n.dom).length;
  return `<div class="card nivres"><h3>🧭 Lo que ya sabes</h3><p class="sub">${
    dom
      ? `Dominas <b>${dom}</b> ${dom === 1 ? 'tema' : 'temas'}: en el plan pasan a repaso rápido (esquema, tarjetas típicas y test) en vez de leerlos enteros.`
      : 'Todavía ningún tema llega al 75 %: el plan sigue igual.'
  }</p><div class="list">${rows
    .map(
      (r) =>
        `<div class="row"><div class="t"><b>${esc(temaName(r.t))}</b><small>${r.p.a}/${r.p.n} bien</small></div>${etiquetaNivel(r.n)}</div>`,
    )
    .join('')}</div></div>`;
}

function vNivel() {
  const est = (S.config || {}).estudios || [];
  const candidatos = temasPorEstudios();
  const nTest = (candidatos.length ? candidatos : S.temas.filter((t) => t.bloque !== 'I')).filter(
    (t) => preguntasTema(t.id).length,
  ).length;
  const chip = (k) =>
    `<button class="chip2${est.includes(k) ? ' on' : ''}" data-act="estud" data-v="${k}" aria-pressed="${est.includes(k)}" title="${esc(ESTUDIOS[k].d)}">${esc(ESTUDIOS[k].n)}</button>`;
  const bloque = (b) => {
    const ts = S.temas.filter((t) => t.bloque === b).sort(ordT);
    return `<div class="ofib"><b>Bloque ${b}</b><div class="list">${ts
      .map((t) => {
        const n = nivelDe(t.id),
          nq = preguntasTema(t.id).length,
          sug = candidatos.some((c) => c.id === t.id);
        return `<div class="row nivrow"><div class="t"><b>${esc(t.codigo)} · ${esc(t.titulo)}</b><small>${n ? `${n.p} % en tu último test · ${esc(fmtD(n.f))}` : sug ? 'Seguramente lo viste en tus estudios' : 'Sin hacer'}</small></div>${etiquetaNivel(n)}<div class="acts">${nq >= 4 ? `<button class="mini" data-act="nivtema" data-id="${esc(t.id)}">Test</button>` : ''}<button class="mini ghost" data-act="nivdom" data-id="${esc(t.id)}" aria-pressed="${dominado(t.id)}">${dominado(t.id) ? 'Quitar «lo domino»' : 'Lo domino'}</button></div></div>`;
      })
      .join('')}</div></div>`;
  };
  return `<p class="sub">Si ya sabes cosas (por ejemplo, de DAM o DAW), no tiene sentido estudiarlas desde cero. Haz el test y los temas que domines pasan a <b>repaso rápido</b> en tu plan. Si no sabes una pregunta, déjala en blanco: aquí no se trata de adivinar.</p>
  <div class="card"><h3>🎓 ¿Qué has estudiado?</h3><div class="chips wrap">${Object.keys(ESTUDIOS).map(chip).join('')}</div>
  <p class="fine">${candidatos.length ? `Con esto, probablemente ya conoces <b>${candidatos.length}</b> temas.` : 'Elige tus estudios y el test general se centrará en los temas que seguramente ya viste.'}</p>
  <div class="acts"><button class="btn" data-act="nivgen"${nTest ? '' : ' disabled'}>Test general (${Math.min(60, nTest * 4)} preguntas)</button></div>
  <p class="fine">4 preguntas por tema, primero las típicas. Sin reloj. Si aciertas el 75 % o más de un tema, lo marco como dominado. También puedes marcarlo tú.</p></div>
  ${['II', 'III', 'IV', 'I'].map(bloque).join('')}`;
}
