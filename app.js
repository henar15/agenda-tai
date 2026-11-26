{
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rich=v=>esc(v).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
const plain=v=>String(v??'').replace(/\*\*/g,'');
const BL={I:{c:'var(--b1)',hex:'#7c3aed',l:'#ede9fe',n:'Organización del Estado y Administración electrónica'},II:{c:'var(--b2)',hex:'#0d9488',l:'#ccfbf1',n:'Tecnología básica'},III:{c:'var(--b3)',hex:'#2563eb',l:'#dbeafe',n:'Desarrollo de sistemas'},IV:{c:'var(--b4)',hex:'#ea580c',l:'#ffedd5',n:'Sistemas y comunicaciones'}};
const EST=['pendiente','en-curso','estudiado'],ESTN={'pendiente':'Pendiente','en-curso':'En curso','estudiado':'Estudiado'};
const S={plan:{},planHecho:{},temasBase:[],temas:[],cards:{},piles:{},estados:{},tests:[],preg:{},res:[],config:{},err:{},rec:{},ready:false};
const ui={mazo:'',filtro:'todas',idx:0,flip:false,test:null,scope:'',game:null};

const fmtD=d=>{if(!d)return'';const x=new Date(d+'T12:00:00');return x.toLocaleDateString('es-ES',{day:'numeric',month:'short'})};
const monday=()=>{const d=new Date();const w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return d.toISOString().slice(0,10)};
const nota=r=>{const t=r.total||1;return Math.max(0,(r.aciertos-(r.fallos||0)/3))/t*10};
const n1=v=>v.toFixed(1).replace('.',',');
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const hash=s=>{let h=0;for(const ch of String(s))h=(h*31+ch.codePointAt(0))|0;return 'q'+(h>>>0).toString(36)};
const LS='agendaTAI:';
const lsGet=k=>{try{return JSON.parse(localStorage.getItem(LS+k))}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(LS+k,JSON.stringify(v))}catch(e){}};
const KEYS=['estados','piles','resultados','errores','config','records','planHecho'];
let fs=null,uid=null,auth=null;
function kvVal(k){return {estados:S.estados,piles:S.piles,resultados:{items:S.res},errores:S.err,config:S.config,records:S.rec,planHecho:S.planHecho}[k]}
function applyKV(k,v){if(v==null)return;if(k==='estados')S.estados=v;else if(k==='piles')S.piles=v;else if(k==='resultados')S.res=v.items||[];else if(k==='errores')S.err=v;else if(k==='config')S.config=v;else if(k==='records')S.rec=v;else if(k==='planHecho')S.planHecho=v}
const kvT={};
function kvSet(k){const v=kvVal(k);lsSet(k,v);if(fs&&uid){clearTimeout(kvT[k]);kvT[k]=setTimeout(()=>{fs.collection('users').doc(uid).collection('kv').doc(k).set({v:JSON.stringify(v),t:Date.now()}).then(()=>flash('Guardado en la nube')).catch(()=>flash('No se pudo guardar en la nube'))},500)}else flash('Guardado en este dispositivo')}
function flash(t){$('#sync').textContent=t}
const temaName=id=>{const t=S.temas.find(x=>x.id===id);return t?t.codigo+' '+t.titulo:id};
const temaBl=id=>{const t=S.temas.find(x=>x.id===id);return BL[(t&&t.bloque)||'I']};

/* banco de preguntas: preguntas/<tema> + tests fijos */
function bank(scope){const out=[],seen=new Set();
  const add=(q,tema)=>{if(!q||!q.opts||q.c==null)return;const id=q.id||hash(q.q);if(seen.has(id))return;seen.add(id);out.push(Object.assign({},q,{id,tema}))};
  Object.entries(S.preg).forEach(([tema,arr])=>{if(!scope||tema===scope)arr.forEach(q=>add(q,tema))});
  S.tests.forEach(t=>{if(!scope||t.tema===scope)(t.preguntas||[]).forEach(q=>add(q,t.tema))});
  return out}
const temasConBanco=()=>{const ids=new Set(bank().map(q=>q.tema));return S.temas.filter(t=>ids.has(t.id)).sort(ordT)};
const temasConCartas=()=>{const ids=new Set(Object.keys(S.cards).filter(k=>S.cards[k].length));return S.temas.filter(t=>ids.has(t.id)).sort(ordT).map(t=>({id:t.id,titulo:'Tema '+t.codigo+' · '+t.titulo+' ('+temaCards(t.id).length+')'}))};
const ordT=(a,b)=>['I','II','III','IV'].indexOf(a.bloque)-['I','II','III','IV'].indexOf(b.bloque)||a.orden-b.orden;
const errList=()=>Object.entries(S.err.items||{}).map(([k,v])=>Object.assign({id:k},v));

/* ---------- inicio ---------- */
function vInicio(){
  const T=S.temas,tot=T.length||34,est=T.filter(t=>t.estado==='estudiado').length,pct=Math.round(est/tot*100);
  const R=2*Math.PI*104,off=R*(1-est/tot);
  const blq=['I','II','III','IV'].map(b=>{const ts=T.filter(t=>t.bloque===b);return{b,n:ts.length,e:ts.filter(t=>t.estado==='estudiado').length}});
  let nCards=0,sabe=0;Object.entries(S.cards).forEach(([t,cs])=>{const p=S.piles[t]||{};cs.forEach(c=>{nCards++;if(p[c.id]===3)sabe++})});
  const media=S.res.length?(S.res.reduce((a,r)=>a+nota(r),0)/S.res.length):null;
  const last=S.res.slice().sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''))[0];
  const lun=monday();const sem=T.filter(t=>t.semana===lun);
  const prox=T.filter(t=>t.semana&&t.semana>lun&&t.estado!=='estudiado').sort((a,b)=>a.semana.localeCompare(b.semana)).slice(0,3);
  const cfg=S.config;let warn='';
  if(!cfg.inscrita){const lim=cfg.inscripcionHasta||'2026-12-29';const d=Math.ceil((new Date(lim+'T23:59:00')-new Date())/864e5);if(d>=0)warn=`<div class="warn"><span style="flex:1">Inscripción en IPS abierta: te quedan <b>${d}</b> días (hasta el ${esc(fmtD(lim))}). Tasa: 15,57 €.</span><button class="btn" data-act="inscrita">Ya estoy inscrita</button></div>`}
  let exam='Sin publicar';if(cfg.examen){const d=Math.ceil((new Date(cfg.examen+'T09:00:00')-new Date())/864e5);exam=d>0?d+' días':'¡Hoy!'}
  const ne=errList().length;
  return `${warn}<div class="hero"><div class="ring"><svg viewBox="0 0 240 240" role="img" aria-label="Temario estudiado ${pct}%"><circle cx="120" cy="120" r="104" fill="none" stroke="var(--line)" stroke-width="22"/><circle cx="120" cy="120" r="104" fill="none" stroke="var(--acc)" stroke-width="22" stroke-linecap="round" stroke-dasharray="${R}" stroke-dashoffset="${off}" transform="rotate(-90 120 120)"/></svg><div class="c"><b>${pct}%</b><span>${est} de ${tot} temas</span></div></div>
  <div><h2>${est?'Vas sumando temas':'Tu oposición, en un solo sitio'}</h2><p class="sub">Un tema no se aprende en una semana: la primera vuelta es para entenderlo, y los repasos cortos con tarjetas lo fijan.</p><div class="bars">${blq.map(x=>`<div class="bar"><div class="lab"><span>Bloque ${x.b} · ${esc(BL[x.b].n)}</span><span>${x.e}/${x.n}</span></div><div class="tr"><i style="width:${x.n?x.e/x.n*100:0}%;background:${BL[x.b].c}"></i></div></div>`).join('')}</div></div></div>
  <div class="kpis"><div class="kpi"><b>${nCards?Math.round(sabe/nCards*100)+'%':'–'}</b><span>tarjetas que te sabes (${sabe} de ${nCards})</span></div><div class="kpi"><b>${media===null?'–':n1(media)}</b><span>nota media de tus tests (sobre 10)</span></div><div class="kpi"><b>${ne}</b><span>preguntas en «Mis errores»</span></div><div class="kpi"><b>${esc(exam)}</b><span>hasta el examen</span></div></div>
  <div class="grid"><div class="card"><h3>Esta semana <a href="#planning" style="font-size:14px;color:var(--acc)">ver planning</a></h3>${sem.length?`<div class="list">${sem.map(rowTema).join('')}</div>`:'<p class="empty">No hay temas asignados a esta semana.</p>'}</div><div class="card"><h3>Lo siguiente</h3>${prox.length?`<div class="list">${prox.map(rowTema).join('')}</div>`:'<p class="empty">Nada pendiente.</p>'}</div></div>`;
}
function bestTest(tid){const r=S.res.filter(x=>x.tema===tid);return r.length?Math.max(...r.map(nota)):null}
function cardPct(tid){const cs=S.cards[tid]||[];const p=S.piles[tid]||{};const s=cs.filter(c=>p[c.id]===3).length;return cs.length?{n:cs.length,s}:null}
function rowTema(t){const b=BL[t.bloque]||BL.I;const cp=cardPct(t.id),bt=bestTest(t.id),nq=bank(t.id).length;
  return `<div class="row"><span class="tag" style="background:${b.c}">${esc(t.codigo)}</span><div class="t"><b>${esc(t.titulo)}</b><small>${t.semana?'Semana del '+esc(fmtD(t.semana)):''}${cp?' · tarjetas '+cp.s+'/'+cp.n:''}${nq?' · '+nq+' preguntas':''}${bt!==null?' · mejor nota '+n1(bt):''}</small></div><button class="pill p-${esc(t.estado||'pendiente')}" data-act="estado" data-id="${esc(t.id)}" aria-label="Cambiar estado">${ESTN[t.estado]||'Pendiente'}</button></div>`}
function vTemario(){
  if(!S.temas.length)return '<p class="empty">Todavía no hay temas cargados.</p>';
  return `<h2>Temario: 34 temas</h2><p class="sub">Pulsa el estado de un tema para cambiarlo: pendiente, en curso o estudiado.</p>`+['I','II','III','IV'].map(b=>{const ts=S.temas.filter(t=>t.bloque===b).sort(ordT);return `<section class="blk"><h3><span class="tag" style="background:${BL[b].c}">Bloque ${b}</span>${esc(BL[b].n)}</h3><div class="list">${ts.map(rowTema).join('')}</div></section>`}).join('');
}

/* ---------- tarjetas ---------- */
function temaCards(tema){const p=S.piles[tema]||{};return (S.cards[tema]||[]).map(c=>Object.assign({},c,{mz:tema,pile:p[c.id]||0,t:!!c.t}))}
function deckCards(){return temaCards(ui.mazo).filter(c=>ui.filtro==='todas'||(ui.filtro==='nueva'&&!c.pile)||(ui.filtro==='tipica'&&c.t)||String(c.pile)===ui.filtro)}
function vTarjetas(){
  if(!Object.keys(S.cards).length)return '<p class="empty">Aún no hay tarjetas.</p>';
  {const tc=temasConCartas();if(!tc.length)return '<p class="empty">Aún no hay tarjetas.</p>';if(!tc.find(t=>t.id===ui.mazo))ui.mazo=tc[0].id}
  const cs=temaCards(ui.mazo);
  const cnt=[0,0,0,0];cs.forEach(c=>cnt[c.pile]++);const tot=cs.length||1;const nt=cs.filter(c=>c.t).length;
  const list=deckCards();if(ui.idx>=list.length)ui.idx=0;const c=list[ui.idx];const b=temaBl(ui.mazo);
  return `<div class="study"><div><h2>Tarjetas</h2><p class="sub">Toca la tarjeta para darle la vuelta y elige en qué montón va.</p></div>
  <div class="picker"><select id="mazo" aria-label="Tema">${temasConCartas().map(x=>`<option value="${esc(x.id)}"${x.id===ui.mazo?' selected':''}>${esc(x.titulo)}</option>`).join('')}</select>
  <select id="filtro" aria-label="Qué tarjetas"><option value="todas">Todas (${cs.length})</option>${nt?`<option value="tipica">Típicas de examen (${nt})</option>`:''}<option value="1">No me la sé (${cnt[1]})</option><option value="2">Dudo (${cnt[2]})</option><option value="3">Me la sé (${cnt[3]})</option><option value="nueva">Sin estudiar (${cnt[0]})</option></select></div>
  <div><div class="stack3"><i style="width:${cnt[3]/tot*100}%;background:#22c55e"></i><i style="width:${cnt[2]/tot*100}%;background:#f59e0b"></i><i style="width:${cnt[1]/tot*100}%;background:#ef4444"></i></div><div class="legend"><span>Me la sé ${cnt[3]}</span><span>Dudo ${cnt[2]}</span><span>No me la sé ${cnt[1]}</span><span>Sin estudiar ${cnt[0]}</span></div></div>
  ${c?`<div class="flip${ui.flip?' on':''}" id="flip" role="button" tabindex="0" aria-label="Girar tarjeta" style="--cc:${b.hex};--cl:${b.l}"><div class="fc"><div class="face f">${c.t?'<span class="tp">Típica de examen</span>':''}<span class="n">${esc(c.n||'')}</span><div class="em">${esc(c.e||'')}</div><div class="q">${rich(c.q)}</div><span class="hint">Toca para ver la respuesta</span></div><div class="face b"><span class="n">${esc(c.n||'')}</span><div class="a">${rich(c.a)}</div>${c.h?`<div class="h">${rich(c.h)}</div>`:''}</div></div></div>
  <div class="piles"><button class="pl1" data-pile="1">No me la sé</button><button class="pl2" data-pile="2">Dudo</button><button class="pl3" data-pile="3">Me la sé</button></div>
  <div style="display:flex;justify-content:space-between;align-items:center"><button class="btn ghost" data-act="prev">Anterior</button><span style="font-weight:800;color:var(--muted)">${ui.idx+1} de ${list.length}</span><button class="btn ghost" data-act="next">Siguiente</button></div>`:'<p class="empty">No hay tarjetas en este montón.</p>'}</div>`;
}

/* ---------- tests ---------- */
function startRun(titulo,tema,preguntas,kind){if(!preguntas.length)return;ui.test={t:{id:kind,titulo,tema,preguntas},kind,i:0,ans:{},shown:{},t0:Date.now()};location.hash='tests';render();scrollTo(0,0)}
function vTests(){
  const T=ui.test;
  if(T&&T.done)return vTestEnd();
  if(T){const q=T.t.preguntas[T.i];const ans=T.ans[T.i];const shown=T.shown[T.i];
    return `<div class="study"><div class="qhead"><span>${esc(T.t.titulo)}</span><span>${T.i+1} / ${T.t.preguntas.length}</span></div>${q.tema&&!T.t.tema?`<div class="qhead"><span>${esc(temaName(q.tema))}</span></div>`:''}<p class="qtext">${rich(q.q)}${q.tipico?'<span class="tip">Típica</span>':''}</p>
    ${q.opts.map((o,k)=>{let cl='opt';if(shown){if(k===q.c)cl+=' ok';else if(k===ans)cl+=' ko'}else if(k===ans)cl+=' sel';return `<button class="${cl}" data-opt="${k}"${shown?' disabled':''}>${'abcd'[k]}) ${rich(o)}</button>`}).join('')}
    ${shown?`<div class="exp">${ans===q.c?'<b>¡Correcto!</b> ':ans==null?'<b>En blanco.</b> ':'<b>No era esa.</b> '}${rich(q.exp||'')}</div>`:''}
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn ghost" data-act="tquit">Salir</button><span style="flex:1"></span>${shown?`<button class="btn" data-act="tnext">${T.i+1<T.t.preguntas.length?'Siguiente':'Ver nota'}</button>`:`<button class="btn ghost" data-act="tblank">Dejar en blanco</button><button class="btn" data-act="tcheck"${ans===undefined?' disabled':''}>Comprobar</button>`}</div></div>`}
  const all=bank(),tip=all.filter(q=>q.tipico),errs=errList(),ts=temasConBanco();
  if(!ui.scope||!ts.find(t=>t.id===ui.scope))ui.scope=ts.length?ts[0].id:'';
  const nScope=ui.scope?bank(ui.scope).length:0;
  return `<h2>Tests</h2><p class="sub">Como en el examen: cada fallo resta un tercio de acierto y las preguntas en blanco no restan. Lo que falles va a «Mis errores».</p>
  <div class="modes">
   <button class="mode red" data-act="merr"${errs.length?'':' disabled'}><b>Mis errores</b><span>Como en la autoescuela: salen de aquí cuando las aciertas 2 veces seguidas.</span><span class="cnt">${errs.length}</span></button>
   <button class="mode" data-act="mtip"${tip.length?'':' disabled'}><b>Típicas de examen</b><span>Las preguntas que más caen, de todos los temas.</span><span class="cnt">${tip.length}</span></button>
   <button class="mode" data-act="msim"${all.length?'':' disabled'}><b>Simulacro</b><span>${Math.min(40,all.length)} preguntas al azar de todos los temas que tienes.</span><span class="cnt">${all.length}</span></button>
  </div>
  <div class="card" style="margin-bottom:28px"><h3>Practicar un tema</h3><div class="picker"><select id="scope" aria-label="Tema">${ts.map(t=>`<option value="${esc(t.id)}"${t.id===ui.scope?' selected':''}>${esc(t.codigo+' · '+t.titulo)}</option>`).join('')}</select><button class="btn" data-act="mtema"${nScope?'':' disabled'}>10 preguntas al azar</button><button class="btn ghost" data-act="mtemaall"${nScope?'':' disabled'}>Todas (${nScope})</button></div></div>
  ${S.tests.length?`<h3>Tests guardados</h3><div class="list">${S.tests.slice().sort((a,b)=>(a.orden||0)-(b.orden||0)).map(t=>{const r=S.res.filter(x=>x.testId===t.id);const best=r.length?Math.max(...r.map(nota)):null;return `<div class="row"><div class="t"><b>${esc(t.titulo)}</b><small>${(t.preguntas||[]).length} preguntas${r.length?' · hecho '+r.length+(r.length>1?' veces':' vez')+' · mejor nota '+n1(best):' · sin hacer'}</small></div><button class="btn" data-act="tstart" data-id="${esc(t.id)}">${r.length?'Repetir':'Empezar'}</button></div>`}).join('')}</div>`:''}`;
}
function vTestEnd(){const T=ui.test,r=T.r;const n=nota(r);
  const fall=T.t.preguntas.map((q,i)=>({q,i,a:T.ans[i]})).filter(x=>x.a!==x.q.c);
  return `<div class="study"><h2>${esc(T.t.titulo)}</h2><div class="card" style="text-align:center"><div class="big" style="color:${n>=5?'var(--ok)':'var(--bad)'}">${n1(n)}</div><p style="margin:6px 0 0;font-weight:800">${r.aciertos} aciertos · ${r.fallos} fallos · ${r.blanco} en blanco</p><p class="sub" style="margin:4px 0 0">${T.saved?'Guardado en tus resultados':'Guardando…'}${fall.length?' · los fallos están en «Mis errores»':''}</p></div>
  ${fall.length?`<h3>Para repasar</h3><div class="list">${fall.map(x=>`<div class="row"><div class="t"><b>${rich(x.q.q)}</b><small>Correcta: ${rich(x.q.opts[x.q.c])}${x.q.exp?' — '+rich(x.q.exp):''}</small></div></div>`).join('')}</div>`:'<p class="empty">¡Sin fallos!</p>'}
  <div style="display:flex;gap:10px"><button class="btn ghost" data-act="tquit">Volver a los tests</button></div></div>`}

/* ---------- juegos ---------- */
function vJuegos(){
  const G=ui.game;
  const ts=temasConBanco(),ms=temasConCartas();
  if(G&&G.kind==='vf')return vVF();
  if(G&&G.kind==='emp')return vEmp();
  const rec=S.rec||{};
  return `<h2>Juegos</h2><p class="sub">Para repasar jugando, en ratos cortos.</p>
  <div class="grid">
   <div class="card"><h3>Verdadero o falso exprés</h3><p>60 segundos. Te enseño una pregunta con una respuesta: ¿es la buena? Cada fallo te quita 5 segundos.</p><p class="sub">Récord: <b>${rec.vf||0}</b> aciertos</p><div class="picker"><select id="gvf" aria-label="Tema del juego"><option value="">Todos los temas</option>${ts.map(t=>`<option value="${esc(t.id)}">${esc(t.codigo+' · '+t.titulo)}</option>`).join('')}</select><button class="btn" data-act="gvf"${bank().length?'':' disabled'}>Jugar</button></div></div>
   <div class="card"><h3>Empareja</h3><p>Une cada pregunta con su respuesta. 6 parejas por ronda, lo más rápido que puedas.</p><p class="sub">Récord: <b>${rec.emp?n1(rec.emp)+' s':'–'}</b></p><div class="picker"><select id="gemp" aria-label="Mazo del juego">${ms.map(m=>`<option value="${esc(m.id)}">${esc(m.titulo)}</option>`).join('')}</select><button class="btn" data-act="gemp"${ms.length?'':' disabled'}>Jugar</button></div></div>
  </div>`}
function vfNext(){const G=ui.game;const q=G.pool[Math.floor(Math.random()*G.pool.length)];const truth=Math.random()<.5;let k=q.c;if(!truth){const o=q.opts.map((_,i)=>i).filter(i=>i!==q.c);k=o[Math.floor(Math.random()*o.length)]}G.cur={q,k,truth:k===q.c};G.fb=''}
function vVF(){const G=ui.game;const left=Math.max(0,Math.ceil((G.end-Date.now())/1000));
  if(G.over)return `<div class="study"><h2>¡Tiempo!</h2><div class="card" style="text-align:center"><div class="big">${G.ok}</div><p style="font-weight:800">aciertos · ${G.ko} fallos${G.rec?' · ¡nuevo récord!':''}</p></div>${G.miss.length?`<h3>Las que fallaste</h3><div class="list">${G.miss.map(x=>`<div class="row"><div class="t"><b>${rich(x.q)}</b><small>Correcta: ${rich(x.opts[x.c])}</small></div></div>`).join('')}</div>`:''}<div style="display:flex;gap:10px"><button class="btn ghost" data-act="gquit">Salir</button><button class="btn" data-act="gvfagain">Otra vez</button></div></div>`;
  const c=G.cur;return `<div class="study"><div class="timer"><span id="gt">${left} s</span><span>${G.ok} aciertos</span></div><div class="stmt">${rich(c.q.q)}<span class="o">${rich(c.q.opts[c.k])}</span></div>${G.fb?`<div class="exp">${G.fb}</div>`:''}<div class="vf"><button class="v" data-act="vfv">Verdadero</button><button class="f" data-act="vff">Falso</button></div><button class="btn ghost" data-act="gquit">Salir</button></div>`}
function empNew(){const G=ui.game;const cs=shuffle(temaCards(G.mazo)).slice(0,6);G.cards=cs;G.left=shuffle(cs.map(c=>c.id));G.right=shuffle(cs.map(c=>c.id));G.done=new Set();G.sel=null;G.bad=null;G.errs=0;G.t0=Date.now();G.over=false}
function vEmp(){const G=ui.game;const by=id=>G.cards.find(c=>c.id===id);
  if(G.over)return `<div class="study"><h2>¡Hecho!</h2><div class="card" style="text-align:center"><div class="big">${n1(G.secs)} s</div><p style="font-weight:800">${G.errs} errores${G.rec?' · ¡nuevo récord!':''}</p></div><div style="display:flex;gap:10px"><button class="btn ghost" data-act="gquit">Salir</button><button class="btn" data-act="gempagain">Otra ronda</button></div></div>`;
  return `<div class="study"><div class="timer"><span>Empareja pregunta y respuesta</span><span>${G.done.size}/${G.cards.length}</span></div><div class="match"><div style="display:grid;gap:10px">${G.left.map(id=>`<button class="${G.done.has(id)?'done':G.sel===id?'sel':G.bad==='l'+id?'bad':''}" data-ml="${esc(id)}"${G.done.has(id)?' disabled':''}>${esc(plain(by(id).q))}</button>`).join('')}</div><div style="display:grid;gap:10px">${G.right.map(id=>`<button class="${G.done.has(id)?'done':G.bad==='r'+id?'bad':''}" data-mr="${esc(id)}"${G.done.has(id)?' disabled':''}>${esc(plain(by(id).a))}</button>`).join('')}</div></div><button class="btn ghost" data-act="gquit">Salir</button></div>`}


/* ---------- planning ---------- */
const FASEC={'v1':'#7c3aed','rep':'#64748b','v2':'#0d9488','final':'#e11d48'};
function vPlan(){
  const P=S.plan||{};const sem=(P.semanas||[]).slice().sort((a,b)=>a.lunes.localeCompare(b.lunes));const fases=P.fases||[];
  if(!sem.length)return '<p class="empty">Todavía no hay planning cargado.</p>';
  const lun=monday();const done=(S.planHecho||{}).h||{};
  const cur=sem.find(w=>w.lunes===lun)||sem.find(w=>w.lunes>lun);
  const tot=fases.length?fases.reduce((a,f)=>a+f.semanas,0):1;
  const wk=w=>{const isNow=w===cur,isPast=w.lunes<lun&&!isNow;const f=fases.find(x=>x.id===w.fase)||(w.fase==='rep'?{corto:'Repaso',color:'#64748b'}:{});const end=new Date(w.lunes+'T12:00:00');end.setDate(end.getDate()+6);
    return `<div class="week${isNow?' now':''}${isPast?' past':''}"><div class="d">${esc(fmtD(w.lunes))}<small>al ${esc(end.toLocaleDateString('es-ES',{day:'numeric',month:'short'}))}${isNow?' · esta semana':''}</small></div><div><h4>${esc(w.titulo)}${f.nombre?`<span class="ph" style="background:${f.color||'#64748b'}">${esc(f.corto||f.nombre)}</span>`:''}</h4><ul class="tasks">${(w.tareas||[]).map((t,i)=>{const k=w.lunes+'-'+i;return `<li><label><input type="checkbox" data-task="${esc(k)}"${done[k]?' checked':''}><span class="${done[k]?'ok':''}">${rich(t)}</span></label></li>`}).join('')}</ul></div></div>`};
  const byMonth={};sem.forEach(w=>{const m=new Date(w.lunes+'T12:00:00').toLocaleDateString('es-ES',{month:'long',year:'numeric'}).replace(' de ',' ');(byMonth[m]=byMonth[m]||[]).push(w)});
  return `<h2>Planning</h2><p class="sub">Semana a semana hasta el examen. Marca las tareas según las vayas haciendo.</p>
  <div class="phases">${fases.map(f=>`<div style="background:${f.color}">${esc(f.nombre)}<small>${esc(f.cuando)}</small></div>`).join('')}</div>
  ${cur?`<h3>Esta semana</h3>${wk(cur)}`:''}
  <h3 style="margin-top:24px">Cada día (2 horas)</h3><div class="routine">${(P.rutina||[]).map(r=>`<div><b>${esc(r.t)}</b>${esc(r.d)}</div>`).join('')}</div>
  ${Object.entries(byMonth).map(([m,ws])=>`<div class="month">${esc(m)}</div>${ws.map(wk).join('')}`).join('')}`;
}

/* ---------- resultados ---------- */
function vResultados(){
  if(!S.res.length)return '<p class="empty">Cuando hagas tests, tus notas aparecerán aquí.</p>';
  const rs=S.res.slice().sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
  return `<h2>Tus resultados</h2><p class="sub">Nota sobre 10 de cada test, con la penalización del examen.</p><div class="card"><div class="fig" id="chart"><svg id="chs"></svg></div></div>
  <div class="scroll" style="margin-top:20px"><table class="stack"><thead><tr><th>Fecha</th><th>Test</th><th class="n">Aciertos</th><th class="n">Fallos</th><th class="n">Blanco</th><th class="n">Nota</th></tr></thead><tbody>${rs.slice().reverse().map(r=>`<tr><td>${esc(fmtD((r.fecha||'').slice(0,10)))}</td><td>${esc(r.titulo)}</td><td class="n">${r.aciertos}</td><td class="n">${r.fallos}</td><td class="n">${r.blanco||0}</td><td class="n"><b>${n1(nota(r))}</b></td></tr>`).join('')}</tbody></table></div>`}
function drawChart(){const s=$('#chs');if(!s)return;const W=s.clientWidth,H=s.clientHeight;const rs=S.res.slice().sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));if(!W||!rs.length)return;
  const L=40,R=34,T=24,B=34,iw=W-L-R,ih=H-T-B;const x=i=>L+(rs.length===1?iw/2:i*iw/(rs.length-1)),y=v=>T+ih-(v/10)*ih;
  let g='';[0,5,10].forEach(v=>{g+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L-8}" y="${y(v)+5}" text-anchor="end" font-size="13" fill="var(--muted)">${v}</text>`});
  const pts=rs.map((r,i)=>[x(i),y(nota(r))]);g+=`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="var(--acc)" stroke-width="3" stroke-linejoin="round"/>`;
  const lab=W>520||rs.length<6;pts.forEach((p,i)=>{const v=nota(rs[i]);g+=`<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="${v>=5?'#22c55e':'#ef4444'}" stroke="var(--bg)" stroke-width="2"/>`;if(lab&&rs.length<=20)g+=`<text x="${p[0]}" y="${p[1]-12}" text-anchor="middle" font-size="13" font-weight="800" fill="var(--ink)">${n1(v)}</text>`});
  if(W>520&&rs.length<=12)rs.forEach((r,i)=>{g+=`<text x="${x(i)}" y="${H-10}" text-anchor="middle" font-size="12" fill="var(--muted)">${esc(fmtD((r.fecha||'').slice(0,10)))}</text>`});
  s.innerHTML=g}
const chartRO=new ResizeObserver(drawChart);

/* ---------- render ---------- */
const V={inicio:vInicio,planning:vPlan,temario:vTemario,tarjetas:vTarjetas,tests:vTests,juegos:vJuegos,resultados:vResultados};
function view(){const h=location.hash.slice(1);return V[h]?h:'inicio'}
function busy(){return (ui.test&&!ui.test.done)||(ui.game&&!ui.game.over)}
function render(){S.temas=S.temasBase.map(t=>Object.assign({},t,{estado:(S.estados||{})[t.id]||'pendiente'}));const v=view();acct();document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.v===v));
  if(!S.ready){$('#app').innerHTML='<p class="empty">Cargando tu agenda…</p>';return}
  $('#app').innerHTML=V[v]();const c=$('#chart');if(c){chartRO.disconnect();chartRO.observe(c);drawChart()}}
addEventListener('hashchange',()=>{scrollTo(0,0);render()});

/* ---------- acciones ---------- */
function markPile(n){const list=deckCards();const c=list[ui.idx];if(!c)return;const id=c.mz;const piles=Object.assign({},S.piles[id]||{});piles[c.id]=n;S.piles=Object.assign({},S.piles,{[id]:piles});ui.flip=false;
  if(ui.filtro==='todas'||ui.filtro==='tipica'||String(n)===ui.filtro)ui.idx++;
  kvSet('piles');render()}
function recordErr(q,right){const items=Object.assign({},S.err.items||{});const k=q.id||hash(q.q);const cur=items[k];
  if(right){if(!cur)return false;const racha=(cur.racha||0)+1;if(racha>=2)delete items[k];else items[k]=Object.assign({},cur,{racha})}
  else items[k]={q:q.q,opts:q.opts,c:q.c,exp:q.exp||'',tema:q.tema||'',tipico:!!q.tipico,fallos:((cur&&cur.fallos)||0)+1,racha:0};
  S.err={items};return true}
async function finishTest(){const T=ui.test;let a=0,f=0,b=0,ch=false;T.t.preguntas.forEach((q,i)=>{const x=T.ans[i];if(x===undefined||x===null)b++;else if(x===q.c){a++;if(recordErr(q,true))ch=true}else{f++;recordErr(q,false);ch=true}});
  if(ch)kvSet('errores');
  T.r={testId:T.t.id,titulo:T.t.titulo,tema:T.t.tema||'',aciertos:a,fallos:f,blanco:b,total:T.t.preguntas.length,fecha:new Date().toISOString()};T.done=true;render();
  S.res=S.res.concat([T.r]);kvSet('resultados');T.saved=true;render()}
let vfTimer=null;
function vfTick(){const G=ui.game;if(!G||G.kind!=='vf'||G.over){clearInterval(vfTimer);return}const left=Math.ceil((G.end-Date.now())/1000);if(left<=0){G.over=true;clearInterval(vfTimer);const rec=S.rec||{};if(G.ok>(rec.vf||0)){G.rec=true;S.rec=Object.assign({},rec,{vf:G.ok});kvSet('records')}render()}else{const el=$('#gt');if(el)el.textContent=left+' s'}}
function startVF(scope){const pool=bank(scope||'');if(!pool.length)return;ui.game={kind:'vf',scope,pool,ok:0,ko:0,miss:[],end:Date.now()+60000};vfNext();clearInterval(vfTimer);vfTimer=setInterval(vfTick,250);render()}
function startEmp(mazo){ui.game={kind:'emp',mazo};empNew();render()}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act],[data-pile],[data-opt],#flip,[data-ml],[data-mr]');if(!el)return;
  if(el.id==='flip'){ui.flip=!ui.flip;el.classList.toggle('on',ui.flip);return}
  if(el.dataset.pile){markPile(+el.dataset.pile);return}
  if(el.dataset.opt!==undefined){const T=ui.test;if(T.shown[T.i])return;T.ans[T.i]=+el.dataset.opt;render();return}
  if(el.dataset.ml!==undefined){const G=ui.game;G.sel=el.dataset.ml;G.bad=null;render();return}
  if(el.dataset.mr!==undefined){const G=ui.game;if(!G.sel)return;const r=el.dataset.mr;if(r===G.sel){G.done.add(r);G.sel=null;if(G.done.size===G.cards.length){G.over=true;G.secs=(Date.now()-G.t0)/1000+G.errs*3;const rec=S.rec||{};if(!rec.emp||G.secs<rec.emp){G.rec=true;S.rec=Object.assign({},rec,{emp:G.secs});kvSet('records')}}}else{G.errs++;G.bad='r'+r}render();return}
  const a=el.dataset.act,T=ui.test,G=ui.game;
  if(a==='estado'){const t=S.temas.find(x=>x.id===el.dataset.id);if(!t)return;t.estado=EST[(EST.indexOf(t.estado||'pendiente')+1)%3];S.estados=Object.assign({},S.estados,{[t.id]:t.estado});kvSet('estados');render()}
  else if(a==='inscrita'){S.config=Object.assign({},S.config,{inscrita:true});kvSet('config');render()}
  else if(a==='next'){ui.idx++;ui.flip=false;render()}
  else if(a==='prev'){ui.idx=Math.max(0,ui.idx-1);ui.flip=false;render()}
  else if(a==='login'){login()}
  else if(a==='logout'){auth&&auth.signOut()}
  else if(a==='tstart'){const t=S.tests.find(x=>x.id===el.dataset.id);if(t&&(t.preguntas||[]).length){ui.test={t:Object.assign({},t,{preguntas:t.preguntas.map(q=>Object.assign({tema:t.tema},q))}),i:0,ans:{},shown:{}};render();scrollTo(0,0)}}
  else if(a==='merr'){startRun('Mis errores','',shuffle(errList()),'errores')}
  else if(a==='mtip'){startRun('Típicas de examen','',shuffle(bank().filter(q=>q.tipico)).slice(0,30),'tipicas')}
  else if(a==='msim'){startRun('Simulacro','',shuffle(bank()).slice(0,40),'simulacro')}
  else if(a==='mtema'||a==='mtemaall'){const qs=shuffle(bank(ui.scope));const t=S.temas.find(x=>x.id===ui.scope);startRun('Práctica · Tema '+(t?t.codigo:''),ui.scope,a==='mtema'?qs.slice(0,10):qs,'practica-'+ui.scope)}
  else if(a==='tquit'){ui.test=null;render()}
  else if(a==='tcheck'){T.shown[T.i]=true;render()}
  else if(a==='tblank'){T.ans[T.i]=null;T.shown[T.i]=true;render()}
  else if(a==='tnext'){if(T.i+1<T.t.preguntas.length){T.i++;render();scrollTo(0,0)}else finishTest()}
  else if(a==='gvf'){startVF($('#gvf').value)}
  else if(a==='gvfagain'){startVF(G.scope)}
  else if(a==='gemp'){startEmp($('#gemp').value)}
  else if(a==='gempagain'){startEmp(G.mazo)}
  else if(a==='gquit'){clearInterval(vfTimer);ui.game=null;render()}
  else if(a==='vfv'||a==='vff'){const said=a==='vfv',c=G.cur;const right=said===c.truth;
    if(right){G.ok++;G.fb='<b>¡Bien!</b>'}else{G.ko++;G.end-=5000;G.miss.push(c.q);G.fb='<b>No.</b> La buena es: '+rich(c.q.opts[c.q.c])}
    const fb=G.fb;vfNext();G.fb=fb;render()}
});
document.addEventListener('keydown',e=>{const f=e.target.closest&&e.target.closest('#flip');if(f&&(e.key==='Enter'||e.key===' ')){e.preventDefault();f.click()}});
document.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.task){const k=e.target.dataset.task;const h=Object.assign({},(S.planHecho||{}).h||{});if(e.target.checked)h[k]=true;else delete h[k];S.planHecho={h};kvSet('planHecho');render();return}const id=e.target.id;if(id==='mazo'){ui.mazo=e.target.value;ui.idx=0;ui.flip=false;render()}else if(id==='filtro'){ui.filtro=e.target.value;ui.idx=0;ui.flip=false;render()}else if(id==='scope'){ui.scope=e.target.value;render()}});

/* ---------- datos ---------- */
const getJ=u=>fetch(u,{cache:'no-cache'}).then(r=>r.ok?r.json():null).catch(()=>null);
function acct(){const el=$('#acct');if(!el)return;if(!window.FIREBASE_CONFIG){el.innerHTML='';return}el.innerHTML=uid?`<button class="btn ghost" data-act="logout" style="min-height:36px;padding:6px 12px">Salir</button>`:`<button class="btn" data-act="login" style="min-height:36px;padding:6px 12px">Entrar con Google</button>`}
async function login(){if(!auth)return;const p=new firebase.auth.GoogleAuthProvider();try{await auth.signInWithPopup(p)}catch(e){try{await auth.signInWithRedirect(p)}catch(e2){flash('No se pudo iniciar sesión')}}}
async function loadRemote(){const snap=await fs.collection('users').doc(uid).collection('kv').get();if(snap.empty){KEYS.forEach(k=>kvSet(k));flash('Progreso subido a la nube');return}snap.forEach(d=>{try{const v=JSON.parse(d.data().v);applyKV(d.id,v);lsSet(d.id,v)}catch(e){}});flash('Sincronizado')}
function loadScript(src){return new Promise((ok,ko)=>{const x=document.createElement('script');x.src=src;x.onload=ok;x.onerror=ko;document.head.appendChild(x)})}
(async()=>{
  render();
  const [idx,plan,tests,seed]=await Promise.all([getJ('data/temas.json'),getJ('data/plan.json'),getJ('data/tests.json'),getJ('data/progreso-inicial.json')]);
  S.temasBase=idx||[];S.plan=plan||{};S.tests=tests||[];
  await Promise.all(S.temasBase.map(async t=>{const [c,p]=await Promise.all([t.tarjetas?getJ(`data/temas/${t.id}.cards.json`):null,t.preguntas?getJ(`data/temas/${t.id}.preguntas.json`):null]);if(c&&c.cards)S.cards[t.id]=c.cards;if(p&&p.preguntas)S.preg[t.id]=p.preguntas}));
  let any=false;KEYS.forEach(k=>{const v=lsGet(k);if(v!=null){any=true;applyKV(k,v)}});
  if(!any&&seed){KEYS.forEach(k=>{if(seed[k]!=null){applyKV(k,seed[k]);lsSet(k,seed[k])}})}
  S.ready=true;flash(window.FIREBASE_CONFIG?'Entra con Google para sincronizar':'Guardado en este dispositivo');render();
  if(window.FIREBASE_CONFIG){try{
    const V='10.12.2';await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-app-compat.js`);await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-auth-compat.js`);await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore-compat.js`);
    firebase.initializeApp(window.FIREBASE_CONFIG);auth=firebase.auth();fs=firebase.firestore();
    auth.onAuthStateChanged(async u=>{uid=u?u.uid:null;if(uid){try{await loadRemote()}catch(e){flash('No se pudo leer de la nube')}}else flash('Entra con Google para sincronizar');if(!busy())render();else acct()});
  }catch(e){flash('No se pudo cargar Firebase')}}
})();
}
