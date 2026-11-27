/**
 * Enrutado por #hash, portada pública, demo y pintado de vistas.
 */
/* ---------- render ---------- */
const V = {
  inicio: vInicio,
  planning: vPlan,
  temario: vTemario,
  tarjetas: vTarjetas,
  tests: vTests,
  juegos: vJuegos,
  resultados: vResultados,
  sesion: vSesion,
};
function view() {
  const h = location.hash.slice(1);
  return V[h] ? h : 'inicio';
}
function vPortada() {
  const F = [
    [
      '🃏',
      'Tarjetas visuales',
      'Una idea por tarjeta, con emoji y lo importante en negrita. Las vas dejando en «No me la sé», «Dudo» o «Me la sé».',
    ],
    [
      '📝',
      'Tests como el examen',
      'Preguntas con trampa, nota sobre 10 y la penalización de verdad: cada fallo resta un tercio.',
    ],
    [
      '🔁',
      'Mis errores',
      'Lo que fallas vuelve a salir hasta que lo aciertas dos veces seguidas, como en la autoescuela.',
    ],
    [
      '🗓️',
      'Tu horario y tu plan',
      'Organiza tu semana y sigue un plan con vueltas de repaso hasta el examen.',
    ],
    ['🔥', 'Racha y logros', 'Más de 40 logros y tu racha de días para no perder el ritmo.'],
    ['📱', 'Móvil y ordenador', 'Entra con Google y tu progreso está en los dos, siempre al día.'],
  ];
  const temasC = S.temasBase.filter((t) => t.tarjetas).length;
  let nC = 0;
  Object.values(S.cards).forEach((c) => (nC += c.length));
  return `<section class="pt-hero"><span class="kick">Oposición TAI · Técnico Auxiliar de Informática</span><h2>Estudia la TAI sin agobios, un poco cada día</h2><p class="sub">Tarjetas para memorizar, tests con trampa y tu propio plan de estudio. Gratis, en el móvil y en el ordenador.</p>
  <div class="acts pt-cta"><a class="btn big2" href="#entrar">Empezar gratis</a><a class="btn ghost big2" href="#probar">Probar sin cuenta</a></div>
  <div class="pt-nums"><div><b>34</b><span>temas del programa</span></div><div><b>${nC || '+200'}</b><span>tarjetas ya hechas</span></div><div><b>${temasC}</b><span>temas con tarjetas (y subiendo)</span></div></div></section>
  <h3 class="pt-h">Qué tienes dentro</h3><div class="pt-feat">${F.map((f) => `<div class="card"><span class="pt-ic" aria-hidden="true">${f[0]}</span><b>${esc(f[1])}</b><p>${esc(f[2])}</p></div>`).join('')}</div>
  <h3 class="pt-h">Cómo funciona</h3><ol class="pt-steps"><li><b>Entra con tu cuenta de Google.</b> No hay contraseñas nuevas que recordar.</li><li><b>Crea tu horario</b> o usa la plantilla, y mira qué te toca cada día.</li><li><b>Estudia con tarjetas y haz tests.</b> La web guarda lo que sabes y lo que fallas.</li></ol>
  <h3 class="pt-h">El examen, en resumen</h3><div class="card pt-exam"><ul><li><b>Primera parte:</b> 80 preguntas tipo test.</li><li><b>Segunda parte:</b> un supuesto práctico de 20 preguntas. En la convocatoria 2026 eliges entre uno de los Bloques II y III o uno de los Bloques II y IV (antes era Bloque III o Bloque IV).</li><li><b>Tiempo:</b> 120 minutos en total.</li><li><b>Penalización:</b> cada respuesta mal resta un tercio de una bien.</li></ul><p class="fine">Datos orientativos: consulta siempre la convocatoria oficial en el BOE.</p></div>
  <h3 class="pt-h">Preguntas frecuentes</h3><div class="pt-faq"><details><summary>¿Cuesta dinero?</summary><p>No, es gratis.</p></details><details><summary>¿Quién ve mis datos?</summary><p>Tu progreso y tu horario solo los ves tú. Para identificar tu cuenta se guardan tu nombre y tu correo de Google y la fecha de tu último acceso; no se comparten con nadie.</p></details><details><summary>¿Sustituye a la academia?</summary><p>No: es una ayuda para repasar y organizarte. El temario completo lo tienes en tus apuntes.</p></details><details><summary>¿Es una web oficial?</summary><p>No. No tiene relación con el INAP ni con ninguna administración.</p></details></div>
  <div class="pt-final card"><b>¿Empezamos?</b><a class="btn big2" href="#entrar">Entrar con Google</a></div>`;
}
function vProbar() {
  const cs = (S.cards['I-1'] || []).filter((c) => c.t).slice(0, 5),
    qs = (S.preg['I-1'] || []).filter((q) => q.tipico).slice(0, 5);
  if (!cs.length) return '<p class="empty">Cargando…</p>';
  const D = (ui.demo = ui.demo || { i: 0, flip: false, q: 0, ans: [] });
  const c = cs[D.i % cs.length],
    b = BL.I;
  let test;
  if (D.q < qs.length) {
    const q = qs[D.q],
      a = D.ans[D.q];
    test = `<p class="fine">Pregunta ${D.q + 1} de ${qs.length}</p><p class="dq">${rich(q.q)}</p>${q.opts.map((o, k) => `<button class="opt${a != null ? (k === q.c ? ' ok' : k === a ? ' ko' : '') : ''}" data-dopt="${k}"${a != null ? ' disabled' : ''}>${rich(o)}</button>`).join('')}${a != null ? `<p class="sub">${rich(q.exp || '')}</p><button class="btn" data-dnext="1">${D.q + 1 < qs.length ? 'Siguiente' : 'Ver resultado'}</button>` : ''}`;
  } else {
    const ok = D.ans.filter((a, k) => a === qs[k].c).length;
    test = `<div class="dres"><b>${ok} de ${qs.length}</b><p>${ok >= 4 ? '¡Muy bien!' : 'Con las tarjetas lo vas a fijar.'} Entra para guardar tu progreso y hacer tests completos.</p><a class="btn" href="#entrar">Empezar gratis</a> <button class="btn ghost" data-dreset="1">Repetir</button></div>`;
  }
  return `<h2>Pruébalo sin cuenta</h2><p class="sub">5 tarjetas y 5 preguntas del tema 1 (Constitución). Aquí no se guarda nada.</p>
  <div class="grid"><div class="card"><h3>Tarjetas</h3><div class="flip${D.flip ? ' on' : ''}" id="dflip" role="button" tabindex="0" aria-label="Girar tarjeta" style="--cc:${b.hex};--cl:${b.l}"><div class="fc"><div class="face f" aria-hidden="${!!D.flip}"><span class="tp">Típica de examen</span><div class="em" aria-hidden="true">${esc(c.e || '')}</div><div class="q">${rich(c.q)}</div><span class="hint">Toca para ver la respuesta</span></div><div class="face b" aria-hidden="${!D.flip}"><div class="a">${rich(c.a)}</div>${c.h ? `<div class="h">${rich(c.h)}</div>` : ''}</div></div></div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px"><button class="btn ghost" data-dcard="-1">Anterior</button><span class="fine">${(D.i % cs.length) + 1} de ${cs.length}</span><button class="btn ghost" data-dcard="1">Siguiente</button></div></div>
  <div class="card"><h3>Mini test</h3>${test}</div></div>
  <div class="pt-final card"><b>¿Te gusta? Hay muchas más tarjetas y tests.</b><a class="btn big2" href="#entrar">Empezar gratis</a></div>`;
}
function vLogin() {
  return `<div class="login"><div class="lg-ico">📚</div><h2>Tu agenda para la oposición TAI</h2><p class="sub">Tarjetas para memorizar, tests con trampa, tu horario y tu progreso. Todo en un sitio, en el móvil y en el ordenador.</p>
  <button class="btn big" data-act="login"><svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Entrar con Google</button>
  <p class="fine">Cada persona tiene su propio progreso y su horario. Solo tú puedes verlos.</p><p><a href="#inicio" class="more">← Volver a la portada</a></p></div>`;
}
function busy() {
  return (
    (ui.game && (ui.game.kind === 'mcq' || ui.game.kind === 'lin')) ||
    (ui.game && ui.game.kind === 'cf' && !ui.game.over) ||
    (ui.ex && !ui.ex.done) ||
    (ui.test && !ui.test.done) ||
    (ui.game && !ui.game.over)
  );
}
function render() {
  S.temas = S.temasBase.map((t) => Object.assign({}, t, { estado: (S.estados || {})[t.id] || 'pendiente' }));
  const v = view();
  acct();
  document.querySelectorAll('#nav a').forEach((a) => {
    const on = a.dataset.v === v;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const gate = !!window.FIREBASE_CONFIG && !S.user;
  document.body.classList.toggle('out', gate);
  if (gate) {
    const h = location.hash.slice(1);
    $('#app').innerHTML =
      h === 'entrar'
        ? S.authReady
          ? vLogin()
          : '<p class="empty">Cargando…</p>'
        : h === 'probar'
          ? vProbar()
          : vPortada();
    scrollTo(0, 0);
    return;
  }
  if (!S.ready) {
    $('#app').innerHTML = '<p class="empty">Cargando tu agenda…</p>';
    return;
  }
  $('#app').innerHTML = V[v]();
  {
    const g = document.querySelector('.xgrid'),
      c = g && g.querySelector('.cur');
    if (c) {
      if (g.scrollWidth > g.clientWidth) g.scrollLeft = c.offsetLeft - g.clientWidth / 2;
      else g.scrollTop = c.offsetTop - g.clientHeight / 2;
    }
  }
  setTimeout(() => {
    checkLogros();
    checkRetos();
    celebrar();
    pomoDraw();
  }, 0);
  const c = $('#chart');
  if (c) {
    chartRO.disconnect();
    chartRO.observe(c);
    drawChart();
  }
}
addEventListener('hashchange', () => {
  scrollTo(0, 0);
  render();
});
