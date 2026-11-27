/**
 * Plan de estudio: plan diario adaptativo, horario semanal y vista Plan (hoy, semana, mes).
 */
/* ---------- plan diario ---------- */
const addD = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
function esDiaEstudio(d) {
  const i = (d.getDay() + 6) % 7;
  if (((S.config || {}).descanso || []).includes(i)) return false;
  if (hayHorario()) return bloquesDia(i).some((b) => b.tipo === 'estudio' || b.tipo === 'repaso');
  return i < 6;
}
function diasEstudioHasta(desde, hasta) {
  let n = 0;
  for (let d = new Date(desde); dkey(d) <= dkey(hasta); d = addD(d, 1)) if (esDiaEstudio(d)) n++;
  return n;
}
function temasEnCurso(ref) {
  const lun = (() => {
    const d = new Date(ref);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return dkey(d);
  })();
  return S.temas
    .filter((t) => t.semana && t.semana <= lun && t.estado !== 'estudiado')
    .sort((a, b) => a.semana.localeCompare(b.semana) || ordT(a, b));
}
function planDia(ref, sim) {
  // sim: avances supuestos (para mañana)
  sim = sim || { lect: {}, cards: {} };
  const out = [];
  const day = new Date(ref);
  if (!esDiaEstudio(day)) return { descanso: true, tareas: [] };
  const fin = addD(day, 6 - ((day.getDay() + 6) % 7));
  const dl = Math.max(1, diasEstudioHasta(day, fin));
  const ts = temasEnCurso(day);
  ts.forEach((t) => {
    const atras = t.semana < monday();
    const dias = atras ? Math.max(1, Math.min(dl, 2)) : dl;
    const dom = dominado(t.id);
    if (dom)
      out.push({
        k: 'q-' + t.id,
        tipo: 'quick',
        tema: t.id,
        txt: `👀 Repaso rápido del tema ${t.codigo}: esquema y test`,
        sub: 'ya lo dominas, no hace falta leerlo entero',
        go: 'temas',
      });
    if (t.pags && !dom) {
      const ini = t.pagIni || 1;
      const leida = Math.max(
        ini - 1,
        sim.lect[t.id] != null ? sim.lect[t.id] : (S.lectura || {})[t.id] || ini - 1,
      );
      const rest = t.pags - leida;
      if (rest > 0) {
        const n = Math.ceil(rest / dias);
        const a = leida + 1,
          b = Math.min(t.pags, leida + n);
        out.push({
          k: 'l-' + t.id + '-' + b,
          tipo: 'lect',
          tema: t.id,
          a,
          b,
          txt: `📖 Lee y subraya las págs. ${a}–${b} del tema ${t.codigo}`,
          sub: `${b - a + 1} páginas · te quedan ${rest} del tema` + (atras ? ' · atrasado' : ''),
        });
      }
    }
    const cs = S.cards[t.id] || [];
    const p = S.piles[t.id] || {};
    const nuevas = cs.filter((c) => !p[c.id] && (!dom || c.t)).length - (sim.cards[t.id] || 0);
    if (nuevas > 0) {
      const n = Math.min(25, Math.ceil(nuevas / dias));
      out.push({
        k: 'c-' + t.id + '-' + dkey(day),
        tipo: 'cards',
        tema: t.id,
        n,
        txt: `🃏 Aprende ${n} tarjetas nuevas del tema ${t.codigo}`,
        sub: `quedan ${nuevas} sin estudiar`,
        go: 'cards',
      });
    } else if (!cs.length && !(S.pedidos || {})[t.id])
      out.push({
        k: 'p-' + t.id,
        tipo: 'pedir',
        tema: t.id,
        txt: `✨ Pide las tarjetas del tema ${t.codigo}`,
        sub: 'Botón «Generar tarjetas» en Temas',
        go: 'temas',
      });
  });
  const dudas = memDueCount();
  if (dudas)
    out.push({
      k: 'r-' + dkey(day),
      tipo: 'rep',
      n: Math.min(30, dudas),
      txt: `🧠 Sesión «A tu ritmo»: ${Math.min(30, dudas)} conceptos`,
      sub: 'lo que estás a punto de olvidar y lo que fallaste',
      go: 'ritmo',
    });
  const ne = errList().length;
  if (ne)
    out.push({
      k: 'e-' + dkey(day),
      tipo: 'err',
      txt: `❌ Haz «Mis errores» (${ne})`,
      sub: 'hasta acertarlas dos veces seguidas',
      go: 'errores',
    });
  const ultimo = diasEstudioHasta(addD(day, 1), fin) === 0;
  const t0 = ts[0];
  if (ultimo && t0)
    out.push({
      k: 't-' + dkey(day),
      tipo: 'test',
      txt: `📝 Test de la semana: tema ${t0.codigo}`,
      sub: '10–20 preguntas para ver qué tal lo llevas',
      go: 'test',
      tema: t0.id,
    });
  else if ((day.getDay() + 6) % 7 === 5 && !semanalHecho())
    out.push({
      k: 's-' + dkey(day),
      tipo: 'sim',
      txt: '🎯 Simulacro semanal (80 + supuesto)',
      sub: '2 horas, como el examen real · ¿pasarías el corte?',
      go: 'semanal',
    });
  return { tareas: out, dl };
}
function ritmo() {
  const objetivo = new Date((S.config || {}).examen || '2027-05-15');
  const hoy = new Date();
  const dias = diasEstudioHasta(hoy, objetivo);
  let pag = 0;
  S.temas.forEach((t) => {
    if (t.estado !== 'estudiado' && t.pags && !dominado(t.id))
      pag += t.pags - Math.max(0, (S.lectura || {})[t.id] || (t.pagIni || 1) - 1);
  });
  return { dias, pag, pd: dias ? Math.ceil(pag / dias) : pag };
}
// Marca (o desmarca) una tarea de hoy. Las lecturas avanzan (o devuelven) las páginas leídas.
function marcarTarea(dk, on) {
  const d = Object.assign({}, S.diario || {});
  const t = Object.assign({}, d[today()] || {});
  if (on) {
    if (t[dk]) return;
    t[dk] = 1;
    logAct(2);
    const m = dk.match(/^l-(.+)-(\d+)$/);
    if (m) {
      const tt = S.temas.find((x) => x.id === m[1]);
      const prevp = (S.lectura || {})[m[1]] || ((tt && tt.pagIni) || 1) - 1;
      statAdd('p', Math.max(0, +m[2] - prevp));
      const d2 = S.diario[today()] || {};
      Object.assign(t, { _s: d2._s });
      t['_prev:' + m[1]] = t['_prev:' + m[1]] != null ? t['_prev:' + m[1]] : prevp;
      S.lectura = Object.assign({}, S.lectura, { [m[1]]: +m[2] });
      kvSet('lectura');
    }
  } else {
    delete t[dk];
    const m = dk.match(/^l-(.+)-(\d+)$/);
    if (m && t['_prev:' + m[1]] != null) {
      S.lectura = Object.assign({}, S.lectura, { [m[1]]: t['_prev:' + m[1]] });
      delete t['_prev:' + m[1]];
      kvSet('lectura');
    }
  }
  Object.assign(t, { _s: (S.diario[today()] || {})._s || t._s });
  d[today()] = t;
  const ks = Object.keys(d).sort();
  while (ks.length > 40) delete d[ks.shift()];
  S.diario = d;
  kvSet('diario');
}
// El plan de hoy se calcula una vez y se guarda: marcar algo no lo cambia ni trae lo de mañana
function planHoy() {
  const d = (S.diario || {})[today()] || {};
  if (d._plan) return d._plan;
  const H = planDia(new Date());
  if (!S.temas.length || !Object.keys(S.cards).length || !uid || !S.remoteOk) return H;
  const snap = {
    descanso: !!H.descanso,
    tareas: (H.tareas || []).map((t) => {
      const o = {};
      ['k', 'tipo', 'tema', 'txt', 'sub', 'go', 'a', 'b', 'n'].forEach((f) => t[f] != null && (o[f] = t[f]));
      return o;
    }),
  };
  S.diario = Object.assign({}, S.diario, { [today()]: Object.assign({}, d, { _plan: snap }) });
  kvSet('diario');
  return snap;
}
// «Empezar el día de 0»: quita lo marcado hoy, devuelve las páginas leídas hoy y rehace el plan
function reiniciarHoy() {
  const d = Object.assign({}, S.diario || {});
  const t = d[today()] || {};
  const lect = Object.assign({}, S.lectura || {});
  const porTema = {};
  Object.keys(t).forEach((k) => {
    const m = k.match(/^l-(.+)-(\d+)$/);
    if (m) porTema[m[1]] = Math.max(porTema[m[1]] || 0, +m[2]);
  });
  const pagsHoy = (t._s || {}).p || 0;
  Object.entries(porTema).forEach(([tema, b]) => {
    const tt = S.temas.find((x) => x.id === tema) || {};
    const ini = (tt.pagIni || 1) - 1;
    let prev = t['_prev:' + tema];
    if (prev == null) prev = Object.keys(porTema).length === 1 ? b - pagsHoy : ini;
    lect[tema] = Math.max(ini, Math.min(lect[tema] || ini, prev));
  });
  S.lectura = lect;
  const s = Object.assign({}, t._s || {});
  s.p = 0;
  d[today()] = { _s: s };
  S.diario = d;
  kvSet('lectura');
  kvSet('diario');
}
function vHoyPlan(compact) {
  const hoy = new Date(),
    man = addD(hoy, 1);
  const H = planHoy();
  const done = (S.diario || {})[today()] || {};
  const sim = { lect: {}, cards: {} };
  (H.tareas || []).forEach((t) => {
    if (t.tipo === 'lect') sim.lect[t.tema] = t.b;
    if (t.tipo === 'cards') sim.cards[t.tema] = (sim.cards[t.tema] || 0) + t.n;
  });
  // mañana parte de cómo quedará todo si haces lo de hoy
  (H.tareas || []).forEach((t) => {
    if (t.tipo === 'lect' && (S.lectura || {})[t.tema] >= t.b) delete sim.lect[t.tema];
  });
  const M = planDia(man, sim);
  const li = (t, chk) =>
    `<li class="dt${chk && done[t.k] ? ' ok' : ''}">${chk ? `<label><input type="checkbox" data-dk="${esc(t.k)}"${done[t.k] ? ' checked' : ''}><span><b>${esc(t.txt)}</b><small>${esc(t.sub || '')}</small></span></label>${t.go ? `<button class="mini" data-act="dgo" data-go="${t.go}" data-t="${esc(t.tema || '')}">Ir</button>` : ''}` : `<span><b>${esc(t.txt)}</b><small>${esc(t.sub || '')}</small></span>`}</li>`;
  const hech = (H.tareas || []).filter((t) => done[t.k]).length,
    tot = (H.tareas || []).length;
  const R2 = ritmo();
  return `<div class="card hoyplan"><h3>Hoy toca ${tot ? `<small>${hech}/${tot} hechas</small>` : ''}${compact ? '' : `<button class="mini ghost" data-act="hoyreset" style="margin-left:8px">${ui.hoyReset ? '¿Seguro? Pulsa otra vez' : '↺ Empezar el día de 0'}</button>`}${ui.pomo ? '' : '<button class="mini hi" data-act="pomo" style="margin-left:auto">🍅 Pomodoro</button>'}</h3>${H.descanso ? '<p class="empty">Hoy es día de descanso 😴</p>' : tot ? `<ul class="dlist">${H.tareas.map((t) => li(t, true)).join('')}</ul>${hech === tot ? '<p class="hoyok">🎉 <b>¡Hoy ya está!</b> Lo de mañana, mañana. Si aún te apetece, una sesión corta «A tu ritmo» nunca sobra.</p>' : ''}` : '<p class="empty">¡Nada pendiente! Si te apetece, haz una sesión «A tu ritmo».</p>'}
  ${compact ? '' : `<h3 style="margin-top:18px">Mañana</h3>${M.descanso ? '<p class="fine">Mañana descansas 😴</p>' : `<ul class="dlist">${(M.tareas || []).map((t) => li(t, false)).join('') || '<li class="fine">Nada todavía</li>'}</ul>`}`}
  <p class="fine" style="margin-top:12px">🎯 Para tenerlo todo leído para mayo: <b>${R2.pd} páginas al día</b> (${R2.pag} páginas en ${R2.dias} días de estudio). Lo que no hagas hoy se reparte en los próximos días.</p></div>`;
}

/* ---------- horario ---------- */
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const hoyIdx = () => (new Date().getDay() + 6) % 7;
const mins = (h) => {
  const [a, b] = h.split(':').map(Number);
  return a * 60 + b;
};
const HT = {
  estudio: ['Estudio', '#6d28d9'],
  repaso: ['Repaso', '#a78bfa'],
  curso: ['Curso', '#2563eb'],
  trabajo: ['Trabajo', '#64748b'],
  comida: ['Comida', '#f59e0b'],
  descanso: ['Descanso', '#10b981'],
  planes: ['Planes', '#e11d48'],
  libre: ['Libre', '#94a3b8'],
};
function bloquesDia(i) {
  const d = (S.horario.dias || [])[i];
  return d && d.bloques ? d.bloques : [];
}
const hayHorario = () => (S.horario.dias || []).some((d) => d && d.bloques && d.bloques.length);
function setDia(i, bl) {
  const dias = [0, 1, 2, 3, 4, 5, 6].map((k) => ({ bloques: bloquesDia(k).slice() }));
  dias[i].bloques = bl.slice().sort((a, b) => a.h.localeCompare(b.h));
  S.horario = Object.assign({}, S.horario, { dias });
  kvSet('horario');
}
function plantilla() {
  const L = [
    { h: '17:00', f: '19:00', t: 'Tema nuevo', tipo: 'estudio' },
    { h: '19:15', f: '20:00', t: 'Repaso con tarjetas', tipo: 'repaso' },
  ];
  const dias = [0, 1, 2, 3, 4, 5, 6].map((k) => ({
    bloques:
      k < 5
        ? L.map((x) => Object.assign({}, x))
        : k === 5
          ? [{ h: '10:00', f: '12:00', t: 'Repaso y test', tipo: 'repaso' }]
          : [],
  }));
  S.horario = { dias };
  kvSet('horario');
}
function horasOpo() {
  let m = 0;
  (S.horario.dias || []).forEach((d) =>
    (d.bloques || []).forEach((b) => {
      if ((b.tipo === 'estudio' || b.tipo === 'repaso') && b.f) {
        let x = mins(b.f === '00:00' ? '24:00' : b.f) - mins(b.h);
        if (x > 0) m += x;
      }
    }),
  );
  return m / 60;
}
function blockRow(b, now) {
  const T = HT[b.tipo] || HT.libre;
  const n = new Date();
  const cur =
    now &&
    mins(b.h) <= n.getHours() * 60 + n.getMinutes() &&
    n.getHours() * 60 + n.getMinutes() < mins(b.f === '00:00' ? '23:59' : b.f);
  return `<div class="blk-h${cur ? ' cur' : ''}" style="--bc:${T[1]}"><span class="hh">${esc(b.h)}${b.f && b.f !== '23:59' ? '–' + esc(b.f) : ''}</span><span class="bt"><b>${esc(b.t)}</b>${b.d ? `<small>${esc(b.d)}</small>` : ''}</span>${cur ? '<span class="ahora">Ahora</span>' : ''}</div>`;
}
function vHorario() {
  const i = ui.hdia == null ? hoyIdx() : ui.hdia;
  const tabs = `<div class="dtabs">${DIAS.map((d, k) => `<button class="${k === i ? 'on' : ''}" data-hdia="${k}" aria-pressed="${k === i}" aria-label="${d}">${d.slice(0, 3)}</button>`).join('')}</div>`;
  if (!hayHorario() && !ui.hedit)
    return `<div class="card hcard"><h3>Tu horario semanal</h3><p class="sub">Apunta cuándo trabajas, comes y estudias. Así sabrás cada día qué te toca.</p><div class="acts"><button class="btn" data-act="hedit">Crear mi horario</button><button class="btn ghost" data-act="hplant">Usar una plantilla</button></div></div>`;
  if (ui.hedit) {
    const bl = bloquesDia(i);
    return `<div class="card hcard"><h3>Editar horario <button class="btn" data-act="hedit" style="margin-left:auto">Listo</button></h3>${tabs}
    <div class="tline">${bl.map((b, k) => `<div class="blk-h" style="--bc:${(HT[b.tipo] || HT.libre)[1]}"><span class="hh">${esc(b.h)}${b.f ? '–' + esc(b.f) : ''}</span><span class="bt"><b>${esc(b.t)}</b><small>${esc((HT[b.tipo] || HT.libre)[0])}</small></span><button class="x" data-act="hdel" data-i="${k}" aria-label="Borrar ${esc(b.t)}">✕</button></div>`).join('') || '<p class="empty">Este día está vacío.</p>'}</div>
    <form class="hform" data-hform="${i}"><label>Desde<input type="time" name="h" required value="17:00"></label><label>Hasta<input type="time" name="f" value="19:00"></label><label class="w">Qué haces<input name="t" required maxlength="40" placeholder="Estudiar tema nuevo"></label><label>Tipo<select name="tipo">${Object.entries(
      HT,
    )
      .map(([k, v]) => `<option value="${k}">${v[0]}</option>`)
      .join('')}</select></label><button class="btn">Añadir</button></form>
    <div class="acts"><button class="mini" data-act="hcopy" data-i="${i}">Copiar el ${esc(DIAS[i].toLowerCase())} a lunes–viernes</button></div></div>`;
  }
  return `<div class="card hcard"><h3>Tu horario <small style="font-weight:700;color:var(--muted)">· ${n1(horasOpo())} h de estudio a la semana</small><button class="mini" data-act="hedit" style="margin-left:auto">Editar</button></h3>${tabs}
  <div class="tline">${
    bloquesDia(i)
      .map((b) => blockRow(b, i === hoyIdx()))
      .join('') || '<p class="empty">Día libre</p>'
  }</div></div>`;
}

/* ---------- planning ---------- */
const FASEC = { v1: '#7c3aed', rep: '#64748b', v2: '#0d9488', final: '#e11d48' };
function vPlan() {
  const P = S.plan || {};
  const sem = (P.semanas || []).slice().sort((a, b) => a.lunes.localeCompare(b.lunes));
  const fases = P.fases || [];
  if (!sem.length) return '<p class="empty">Todavía no hay planning cargado.</p>';
  const lun = monday();
  const done = (S.planHecho || {}).h || {};
  const cur = sem.find((w) => w.lunes === lun) || sem.find((w) => w.lunes > lun);
  const tot = fases.length ? fases.reduce((a, f) => a + f.semanas, 0) : 1;
  const wk = (w) => {
    const isNow = w === cur,
      isPast = w.lunes < lun && !isNow;
    const f =
      fases.find((x) => x.id === w.fase) || (w.fase === 'rep' ? { corto: 'Repaso', color: '#64748b' } : {});
    const end = new Date(w.lunes + 'T12:00:00');
    end.setDate(end.getDate() + 6);
    return `<div class="week${isNow ? ' now' : ''}${isPast ? ' past' : ''}"><div class="d">${esc(fmtD(w.lunes))}<small>al ${esc(end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }))}${isNow ? ' · esta semana' : ''}</small></div><div><h4>${esc(w.titulo)}${f.nombre ? `<span class="ph" style="background:${f.color || '#64748b'}">${esc(f.corto || f.nombre)}</span>` : ''}</h4><ul class="tasks">${(
      w.tareas || []
    )
      .map((t, i) => {
        const k = w.lunes + '-' + i;
        return `<li><label><input type="checkbox" data-task="${esc(k)}"${done[k] ? ' checked' : ''}><span class="${done[k] ? 'ok' : ''}">${rich(t)}</span></label></li>`;
      })
      .join('')}</ul></div></div>`;
  };
  const byMonth = {};
  sem.forEach((w) => {
    const m = new Date(w.lunes + 'T12:00:00')
      .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
      .replace(' de ', ' ');
    (byMonth[m] = byMonth[m] || []).push(w);
  });
  const PT = [
    ['hoy', '📌 Hoy'],
    ['sem', '📅 Semana'],
    ['mes', '🗓️ Mes'],
    ['hor', '⏰ Horario'],
  ];
  if (!ui.ptab) ui.ptab = 'hoy';
  const tabs = `<div class="ptabs" role="tablist">${PT.map(([k, t]) => `<button role="tab" aria-selected="${ui.ptab === k}" class="${ui.ptab === k ? 'on' : ''}" data-ptab="${k}">${t}</button>`).join('')}</div>`;
  let body = '';
  if (ui.ptab === 'hoy') body = vHoyPlan(false);
  else if (ui.ptab === 'hor') body = vHorario();
  else if (ui.ptab === 'sem') {
    const ts = S.temas.filter((t) => t.semana === lun);
    const prog = (t) => {
      const ini = t.pagIni || 1;
      const l = Math.max(0, ((S.lectura || {})[t.id] || ini - 1) - ini + 1),
        tot = Math.max(1, t.pags - ini + 1);
      const cp = cardPct(t.id);
      return `<div class="row"><span class="tag" style="background:${BL[t.bloque].c}">${esc(t.codigo)}</span><div class="t"><b>${esc(t.titulo)}</b>${t.pags ? `<div class="pbar"><span>📖 Lectura</span><div class="tr"><i style="width:${Math.min(100, (l / tot) * 100)}%"></i></div><small>${Math.min(l, tot)}/${tot} págs.</small></div>` : ''}${cp ? `<div class="pbar"><span>🃏 Tarjetas</span><div class="tr"><i style="width:${(cp.s / cp.n) * 100}%;background:#22c55e"></i></div><small>${cp.s}/${cp.n}</small></div>` : ''}</div><button class="pill p-${esc(t.estado || 'pendiente')}" data-act="estado" data-id="${esc(t.id)}">${ESTN[t.estado] || 'Pendiente'}</button></div>`;
    };
    const dias = [0, 1, 2, 3, 4, 5, 6]
      .map((k) => {
        const d = addD(new Date(lun + 'T12:00:00'), k);
        const dk = dkey(d);
        const est = esDiaEstudio(d);
        const hechas = hechasDe((S.diario || {})[dk]).length;
        return `<div class="wd${dk === today() ? ' cur' : ''}${est ? '' : ' rest'}"><b>${DIAS[k].slice(0, 3)}</b><small>${d.getDate()}</small><span>${!est ? '😴' : dayOk(dk) ? '✅' : hechas ? '◐' : '·'}</span></div>`;
      })
      .join('');
    body = `<div class="card"><h3>Esta semana</h3><div class="wdays">${dias}</div><p class="fine">✅ meta cumplida · ◐ empezado · 😴 descanso</p></div>
    <h3 class="hsec">Temas de la semana</h3>${ts.length ? `<div class="list">${ts.map(prog).join('')}</div>` : '<p class="empty">Esta semana no hay temas nuevos: toca repasar.</p>'}
    ${cur ? `<details class="mes nocap" style="margin-top:16px"><summary>Tareas del plan de esta semana</summary>${wk(cur)}</details>` : ''}`;
  } else {
    const mesAct = new Date()
      .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
      .replace(' de ', ' ');
    body = `<p class="sub">Qué temas tocan cada mes hasta el examen. Toca un mes para ver sus semanas.</p>${Object.entries(
      byMonth,
    )
      .map(([m, ws]) => {
        const cods = [
          ...new Set(S.temas.filter((t) => ws.some((w) => w.lunes === t.semana)).map((t) => t.codigo)),
        ];
        const ph = [
          ...new Set(
            ws
              .map(
                (w) => (fases.find((x) => x.id === w.fase) || {}).corto || (w.fase === 'rep' ? 'Repaso' : ''),
              )
              .filter(Boolean),
          ),
        ];
        return `<details class="mes"${m === mesAct ? ' open' : ''}><summary><span>${esc(m)}${m === mesAct ? ' · este mes' : ''}</span><small>${cods.length ? cods.join(' · ') : ph.join(' · ')}</small></summary>${ws.map(wk).join('')}</details>`;
      })
      .join('')}`;
  }
  return `<h2>Planning</h2>${tabs}${body}`;
}
