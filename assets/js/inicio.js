/**
 * Pantalla de inicio.
 */
/* ---------- inicio ---------- */
function vInicio() {
  const T = S.temas;
  let nCards = 0,
    sabe = 0;
  Object.entries(S.cards).forEach(([t, cs]) => {
    const p = S.piles[t] || {};
    cs.forEach((c) => {
      nCards++;
      if (p[c.id] === 3) sabe++;
    });
  });
  const media = S.res.length ? S.res.reduce((a, r) => a + nota(r), 0) / S.res.length : null;
  const lun = monday();
  const sem = T.filter((t) => t.semana === lun);
  const cfg = S.config;
  let warn = '';
  if (!cfg.inscrita) {
    const lim = cfg.inscripcionHasta || '2026-12-29';
    const d = Math.ceil((new Date(lim + 'T23:59:00') - new Date()) / 864e5);
    if (d >= 0)
      warn = `<div class="warn"><span style="flex:1">Inscripción abierta: quedan <b>${d}</b> días.</span><button class="mini" data-act="inscrita">Ya me inscribí</button></div>`;
  }
  const ne = errList().length,
    r = racha();
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const hoy = bloquesDia(hoyIdx());
  const cur = hoy.find((b) => mins(b.h) <= now && now < mins(!b.f || b.f === '00:00' ? '23:59' : b.f));
  const next = hoy.filter((b) => mins(b.h) > now).slice(0, 2);
  const nombre = ((S.user && S.user.displayName) || '').split(' ')[0];
  const hoyHtml = hayHorario()
    ? `<div class="tline">${
        (cur ? [cur] : [])
          .concat(next)
          .map((b) => blockRow(b, true))
          .join('') || '<p class="empty">No te queda nada más hoy. ¡A descansar!</p>'
      }</div><a class="more" href="#planning">Ver el día completo</a>`
    : `<p class="sub" style="margin:0 0 8px">Crea tu horario y aquí verás qué te toca en cada momento.</p><a class="btn ghost" href="#planning">Crear mi horario</a>`;
  return `${warn}<h2 class="hola">Hola${nombre ? ', ' + esc(nombre) : ''} 👋</h2>${vMascota()}${vResumenDia()}${vHoyPlan(true)}
  <div class="card"><h3>Ahora</h3>${hoyHtml}</div>
  <div class="go"><a class="gob" href="#tarjetas" data-act="dgo" data-go="repaso"><span>🃏</span><b>Repasar tarjetas${cardsDueHoy() ? ` (${cardsDueHoy()} hoy)` : ''}</b></a><a class="gob" href="#tests"><span>📝</span><b>Hacer un test</b></a>${ne ? `<a class="gob" href="#tests"><span>🔁</span><b>Mis errores (${ne})</b></a>` : ''}</div>
  <div class="kpis"><div class="kpi"><b>⏳ ${Math.max(0, Math.ceil((new Date((cfg.examen || '2027-05-15') + 'T09:00:00') - new Date()) / 864e5))}</b><span>días ${cfg.examen ? 'para el examen' : 'hasta mayo (fecha sin publicar)'}</span></div><div class="kpi"><b>${nCards ? Math.round((sabe / nCards) * 100) + '%' : '–'}</b><span>tarjetas sabidas</span></div><div class="kpi"><b>${notaEstimada() == null ? '–' : n1(notaEstimada())}</b><span>nota estimada</span></div></div>${vRetos()}${window._bip ? `<div class="card inst"><b>📲 Instala la agenda como app</b><p class="fine">Tendrás un icono en el móvil y podrás estudiar sin conexión.</p><button class="btn" data-act="install">Instalar</button></div>` : ''}
`;
}
