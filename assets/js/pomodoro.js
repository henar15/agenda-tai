/**
 * Pomodoro con modo concentración a pantalla completa.
 */
/* ---------- pomodoro ---------- */
let pomoT = null;
function pomoStart() {
  const P = (ui.pomo = {
    fase: 'estudio',
    fin: Date.now() + 25 * 60000,
    n: (ui.pomo && ui.pomo.n) || 0,
    min: false,
  });
  clearInterval(pomoT);
  pomoT = setInterval(pomoTick, 1000);
  pomoDraw();
}
function pomoStop() {
  clearInterval(pomoT);
  ui.pomo = null;
  pomoDraw();
}
function pomoTick() {
  const P = ui.pomo;
  if (!P) return;
  if (Date.now() >= P.fin) {
    if (P.fase === 'estudio') {
      P.n++;
      statAdd('m', 1);
      logAct(5);
      try {
        navigator.vibrate && navigator.vibrate([200, 100, 200]);
      } catch (e) {}
      toast('🍅', '¡Pomodoro terminado!', '+5 puntos · 5 minutos de descanso');
      P.fase = 'descanso';
      P.fin = Date.now() + 5 * 60000;
    } else {
      toast('📚', 'Fin del descanso', '¡Otro pomodoro!');
      P.fase = 'estudio';
      P.fin = Date.now() + 25 * 60000;
    }
  }
  pomoDraw();
}
function pomoDraw() {
  let w = document.getElementById('pomo');
  const P = ui.pomo;
  if (!P) {
    if (w) w.remove();
    document.body.classList.remove('focus');
    return;
  }
  if (!w) {
    w = document.createElement('div');
    w.id = 'pomo';
    w.setAttribute('role', 'timer');
    document.body.appendChild(w);
  }
  const l = Math.max(0, P.fin - Date.now()),
    m = Math.floor(l / 60000),
    sg = Math.floor((l % 60000) / 1000),
    tt = m + ':' + String(sg).padStart(2, '0');
  const r = R();
  const tot = (P.fase === 'estudio' ? 25 : 5) * 60000;
  const pct = 1 - l / tot;
  const svg = (sz) =>
    mascSVG(
      etapa(r.n),
      accDe((S.rec || {}).acMax || 0),
      P.fase === 'estudio' ? 'wait' : 'happy',
      sz,
      mascName(),
    );
  document.body.classList.toggle('focus', !P.min);
  if (P.min) {
    w.className = 'mini ' + P.fase;
    w.innerHTML = `<button class="pexp" data-act="pomomax" aria-label="Abrir pomodoro a pantalla completa"><span class="pm">${svg(44)}</span><span><small>${P.fase === 'estudio' ? 'Estudiando' : 'Descanso'} · 🍅 ${P.n}</small><b>${tt}</b></span></button><button class="mini ghost" data-act="pomostop" aria-label="Parar pomodoro">✕</button>`;
    return;
  }
  const R0 = 140,
    C = 2 * Math.PI * R0;
  w.className = 'full ' + P.fase;
  w.innerHTML = `<div class="pbtns"><button data-act="pomomin" aria-label="Minimizar">–</button><button data-act="pomostop" aria-label="Parar pomodoro">✕</button></div>
  <div class="pcenter"><div class="pring"><svg viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="${R0}" fill="none" stroke="rgb(255 255 255 / .15)" stroke-width="10"/><circle cx="150" cy="150" r="${R0}" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 150 150)"/></svg><div class="pmasc">${svg(170)}</div></div>
  <b class="ptime" aria-live="off">${tt}</b><p class="pfase">${P.fase === 'estudio' ? `Concéntrate. ${esc(mascName())} te acompaña 🤫` : 'Descanso: levántate, bebe agua y estira 🌿'}</p><p class="pcount">🍅 ${P.n} hoy en esta sesión</p></div>`;
}
