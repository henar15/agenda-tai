{
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rich=v=>esc(v).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
const plain=v=>String(v??'').replace(/\*\*/g,'');
const BL={I:{c:'var(--b1)',hex:'#7c3aed',l:'#ede9fe',n:'Organización del Estado y Administración electrónica'},II:{c:'var(--b2)',hex:'#0d9488',l:'#ccfbf1',n:'Tecnología básica'},III:{c:'var(--b3)',hex:'#2563eb',l:'#dbeafe',n:'Desarrollo de sistemas'},IV:{c:'var(--b4)',hex:'#ea580c',l:'#ffedd5',n:'Sistemas y comunicaciones'}};
const EST=['pendiente','en-curso','estudiado'],ESTN={'pendiente':'Pendiente','en-curso':'En curso','estudiado':'Estudiado'};
const S={exIdx:[],exams:{},horario:{dias:[]},act:{},pedidos:{},user:null,authReady:false,plan:{},planHecho:{},temasBase:[],temas:[],cards:{},piles:{},estados:{},tests:[],preg:{},res:[],config:{},err:{},rec:{},ready:false};
const ui={pomo:null,xtab:'web',ex:null,xcfg:null,hdia:null,hedit:false,mazo:'',filtro:'todas',idx:0,flip:false,test:null,scope:'',game:null};

const fmtD=d=>{if(!d)return'';const x=new Date(d+'T12:00:00');return x.toLocaleDateString('es-ES',{day:'numeric',month:'short'})};
const monday=()=>{const d=new Date();const w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return d.toISOString().slice(0,10)};
const nota=r=>{const t=r.total||1;return Math.max(0,(r.aciertos-(r.fallos||0)/3))/t*10};
const n1=v=>v.toFixed(1).replace('.',',');
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const hash=s=>{let h=0;for(const ch of String(s))h=(h*31+ch.codePointAt(0))|0;return 'q'+(h>>>0).toString(36)};
let LS='agendaTAI:anon:';
const lsGet=k=>{try{return JSON.parse(localStorage.getItem(LS+k))}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(LS+k,JSON.stringify(v))}catch(e){}};
const KEYS=['estados','piles','resultados','errores','config','records','planHecho','actividad','horario','recursos','lectura','diario','srs'];
let fs=null,uid=null,auth=null;
function kvVal(k){return {srs:S.srs,lectura:S.lectura,diario:S.diario,recursos:S.recursos,horario:S.horario,actividad:S.act,estados:S.estados,piles:S.piles,resultados:{items:S.res},errores:S.err,config:S.config,records:S.rec,planHecho:S.planHecho}[k]}
function applyKV(k,v){if(v==null)return;if(k==='estados')S.estados=v;else if(k==='piles')S.piles=v;else if(k==='resultados')S.res=v.items||[];else if(k==='errores')S.err=v;else if(k==='config')S.config=v;else if(k==='records')S.rec=v;else if(k==='planHecho')S.planHecho=v;else if(k==='actividad')S.act=v;else if(k==='horario')S.horario=v;else if(k==='recursos')S.recursos=v;else if(k==='lectura')S.lectura=v;else if(k==='diario')S.diario=v;else if(k==='srs')S.srs=v}
const kvT={};
function kvSet(k){const v=kvVal(k);lsSet(k,v);if(fs&&uid){clearTimeout(kvT[k]);kvT[k]=setTimeout(()=>{fs.collection('users').doc(uid).collection('kv').doc(k).set({v:JSON.stringify(v),t:Date.now()}).then(()=>flash('Guardado en la nube')).catch(()=>flash('No se pudo guardar en la nube'))},500)}else flash('Guardado en este dispositivo')}
function flash(t){const e=$('#sync');if(e)e.textContent=t}
function resetUser(){Object.assign(S,{srs:{},lectura:{},diario:{},recursos:null,horario:{dias:[]},act:{},estados:{},piles:{},res:[],err:{},config:{},rec:{},planHecho:{}})}
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

/* ---------- motivación ---------- */
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const dkey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function logAct(n){const k=today();const v=((S.act||{})[k]||0)+(n||1);S.act=Object.assign({},S.act,{[k]:v});kvSet('actividad');const ok=(S.rec||{}).ok||{};if(v>=metaDia()&&!ok[k]){S.rec=Object.assign({},S.rec,{ok:Object.assign({},ok,{[k]:1})});kvSet('records');toast('🎯','¡Meta de hoy cumplida!',mascName()+' está feliz')}}
function toast(ic,t,sub){const x=document.createElement('div');x.className='toast';x.setAttribute('role','status');x.innerHTML=`<span aria-hidden="true">${esc(ic)}</span><div><small>${esc(t)}</small><b>${esc(sub)}</b></div>`;document.body.appendChild(x);setTimeout(()=>x.remove(),4000)}
function heat(){const a=S.act||{};const end=new Date();const start=new Date();start.setDate(start.getDate()-7*12+1-((start.getDay()+6)%7)+((end.getDay()+6)%7));
  let cols='',d=new Date(start);const mx=Math.max(5,...Object.values(a));
  while(d<=end){let col='';for(let i=0;i<7;i++){const k=dkey(d);const v=a[k]||0;const op=v?0.25+0.75*Math.min(1,v/mx):0;col+=`<i title="${esc(k)}: ${v}" style="background:${v?`color-mix(in srgb,var(--acc) ${Math.round(op*100)}%,var(--panel))`:'var(--line)'}${d>end?';visibility:hidden':''}"></i>`;d.setDate(d.getDate()+1)}cols+=`<div>${col}</div>`}
  return `<div class="heat">${cols}</div>`}
function logros(){let sabe=0;Object.entries(S.cards).forEach(([t,cs])=>{const p=S.piles[t]||{};cs.forEach(c=>{if(p[c.id]===3)sabe++})});
  const r=racha(),T=S.temas,est=T.filter(t=>t.estado==='estudiado').length,notas=S.res.map(nota),best=notas.length?Math.max(...notas):0,n=S.res.length,
    sims=S.res.filter(x=>/simulacro/i.test(x.titulo||'')).length,rec=S.rec||{},dias=Object.keys(S.act||{}).length,tareas=Object.keys((S.planHecho||{}).h||{}).length,
    blq=b=>{const ts=T.filter(t=>t.bloque===b);return ts.length&&ts.every(t=>t.estado==='estudiado')},
    seguidos=(()=>{let m=0,c=0;S.res.slice().sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'')).forEach(x=>{c=nota(x)>=7?c+1:0;m=Math.max(m,c)});return m})(),
    errCero=n>=5&&!errList().length,tipicas=Object.entries(S.cards).reduce((a,[t,cs])=>a+cs.filter(c=>c.t&&(S.piles[t]||{})[c.id]===3).length,0);
  const L=(id,ic,g,nom,des,ok)=>({id,ic,g,nom,des,ok:!!ok});
  return [
   L('c10','🃏','Tarjetas','Primeras tarjetas','Te sabes 10 tarjetas',sabe>=10),L('c50','🃏','Tarjetas','Cogiendo ritmo','50 tarjetas sabidas',sabe>=50),L('c100','💯','Tarjetas','Cien','100 tarjetas sabidas',sabe>=100),
   L('c250','🧠','Tarjetas','Memoria de elefante','250 tarjetas sabidas',sabe>=250),L('c500','🐘','Tarjetas','Quinientas','500 tarjetas sabidas',sabe>=500),L('c1000','🏛️','Tarjetas','Enciclopedia','1.000 tarjetas sabidas',sabe>=1000),
   L('tip25','⭐','Tarjetas','Lo que cae','25 típicas de examen sabidas',tipicas>=25),L('tip100','🌟','Tarjetas','Cazatípicas','100 típicas de examen sabidas',tipicas>=100),
   L('t1','📝','Tests','Primer test','Haz tu primer test',n>=1),L('t5','📝','Tests','Calentando','5 tests hechos',n>=5),L('t10','📚','Tests','Diez tests','10 tests hechos',n>=10),L('t25','🏋️','Tests','Entrenamiento serio','25 tests hechos',n>=25),L('t50','🏆','Tests','Máquina de tests','50 tests hechos',n>=50),
   L('n5','✅','Tests','Aprobado','Saca un 5 o más',best>=5),L('n7','👍','Tests','Notable','Saca un 7 o más',best>=7),L('n9','🎓','Tests','Sobresaliente','Saca un 9 o más',best>=9),L('n10','💎','Tests','Perfecto','Saca un 10',best>=10),
   L('s3','📈','Tests','En racha','3 tests seguidos con 7 o más',seguidos>=3),L('sim1','⏱️','Tests','Simulacro','Termina un simulacro',sims>=1),L('sim5','🎯','Tests','Lista para el examen','5 simulacros terminados',sims>=5),
   L('err0','🧹','Tests','Sin errores pendientes','Deja «Mis errores» a cero tras 5 tests',errCero),
   L('r3','🔥','Constancia','Constancia','Racha de 3 días',r>=3),L('r7','🔥','Constancia','Semana perfecta','Racha de 7 días',r>=7),L('r14','🔥','Constancia','Dos semanas','Racha de 14 días',r>=14),L('r30','🌋','Constancia','Imparable','Racha de 30 días',r>=30),L('r60','☄️','Constancia','Disciplina de hierro','Racha de 60 días',r>=60),L('r100','👑','Constancia','Leyenda','Racha de 100 días',r>=100),
   L('d10','📅','Constancia','10 días','Estudia 10 días distintos',dias>=10),L('d50','📅','Constancia','50 días','Estudia 50 días distintos',dias>=50),L('d100','🗓️','Constancia','100 días','Estudia 100 días distintos',dias>=100),
   L('e1','📗','Temario','Primer tema','Marca un tema como estudiado',est>=1),L('e5','📘','Temario','Cinco temas','5 temas estudiados',est>=5),L('e10','📙','Temario','Diez temas','10 temas estudiados',est>=10),L('e20','📕','Temario','Más de la mitad','20 temas estudiados',est>=20),L('e34','🎉','Temario','Temario completo','Los 34 temas estudiados',est>=34),
   L('bI','🏛️','Temario','Bloque I','Todo el Bloque I estudiado',blq('I')),L('bII','💻','Temario','Bloque II','Todo el Bloque II estudiado',blq('II')),L('bIII','🧩','Temario','Bloque III','Todo el Bloque III estudiado',blq('III')),L('bIV','🌐','Temario','Bloque IV','Todo el Bloque IV estudiado',blq('IV')),
   L('hor','🗓️','Organización','Organizada','Crea tu horario semanal',hayHorario()),L('pl10','☑️','Organización','Cumplidora','Marca 10 tareas del planning',tareas>=10),L('pl50','✔️','Organización','Plan en marcha','Marca 50 tareas del planning',tareas>=50),L('ins','🖊️','Organización','Inscrita','Marca que ya te has inscrito',(S.config||{}).inscrita),
   L('vf15','⚡','Juegos','Velocista','15 aciertos en Verdadero o falso',(rec.vf||0)>=15),L('vf25','⚡','Juegos','Rayo','25 aciertos en Verdadero o falso',(rec.vf||0)>=25),L('pm1','🍅','Constancia','Primer pomodoro','Termina un pomodoro',Object.values(S.diario||{}).some(d=>(d._s||{}).m>0)),L('st3','⭐','Constancia','Retadora','Consigue 3 estrellas',estrellas()>=3),L('emp','🧩','Juegos','Emparejadora','Completa Empareja en menos de 60 s',rec.emp&&rec.emp<60)]}
function checkLogros(){if(!S.user||!S.ready)return;const ok=logros().filter(x=>x.ok).map(x=>x.id);const vistos=(S.rec||{}).logros;
  if(!Array.isArray(vistos)){S.rec=Object.assign({},S.rec,{logros:ok});kvSet('records');return}
  const nuevos=ok.filter(id=>!vistos.includes(id));if(!nuevos.length)return;S.rec=Object.assign({},S.rec,{logros:vistos.concat(nuevos)});kvSet('records');
  const l=logros().find(x=>x.id===nuevos[0]);const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.innerHTML=`<span>${esc(l.ic)}</span><div><small>¡Nuevo logro!</small><b>${esc(l.nom)}</b>${nuevos.length>1?`<small>y ${nuevos.length-1} más</small>`:''}</div>`;document.body.appendChild(t);setTimeout(()=>t.remove(),4500)}

/* ---------- mascota, meta diaria y escudos ---------- */
const ETAPAS=[{d:0,n:'Huevo nuevo'},{d:1,n:'Huevo'},{d:3,n:'Huevo con grietas'},{d:7,n:'Pollito'},{d:14,n:'Polluelo'},{d:30,n:'Pájaro'},{d:60,n:'Pájaro sabio'},{d:100,n:'Fénix'}];
const ACCS=[{a:10,id:'gafas',n:'Gafas de empollona'},{a:25,id:'birrete',n:'Birrete'},{a:50,id:'corona',n:'Corona'}];
const metaDia=()=>{const m=+((S.config||{}).meta);return [10,20,40].includes(m)?m:20};
const mascName=()=>((S.config||{}).masc||'Pipo').slice(0,16);
const dayOk=d=>!!((S.rec||{}).ok||{})[d]||(((S.act||{})[d]||0)>=metaDia());
function R(){const act=S.act||{},ok=(S.rec||{}).ok||{};const ks=Object.keys(act).concat(Object.keys(ok)).sort();const t=today();const pts=act[t]||0;
  if(!ks.length)return {n:0,esc:0,hoy:false,pts,meta:metaDia(),salvados:0,descanso:false};
  let n=0,esc=0,salv=0;const d=new Date(ks[0]+'T12:00:00');
  const rest=new Set(((S.config||{}).descanso)||[]);const isRest=x=>rest.has((x.getDay()+6)%7);
  while(dkey(d)<t){if(!dayOk(dkey(d))&&isRest(d)){d.setDate(d.getDate()+1);continue}if(dayOk(dkey(d))){n++;if(n%7===0)esc=Math.min(2,esc+1)}else if(n>0&&esc>0){esc--;salv++}else n=0;d.setDate(d.getDate()+1)}
  const hoy=dayOk(t);if(hoy){n++;if(n%7===0)esc=Math.min(2,esc+1)}
  return {n,esc,hoy,pts,meta:metaDia(),salvados:salv,descanso:!hoy&&isRest(new Date())}}
function racha(){return R().n}
const etapa=n=>{let i=0;ETAPAS.forEach((e,k)=>{if(n>=e.d)i=k});return i};
const accDe=m=>{let r=null;ACCS.forEach(x=>{if(m>=x.a)r=x});return r};
function mascSVG(st,acc,mood,size,label,prem){prem=prem||(typeof premiosDe==='function'&&S.user?premiosDe():[]);
  const egg=st<=2,chick=st===3||st===4,bird=st>=5;
  const C=['#fff4dc','#fff4dc','#fff4dc','#ffd43b','#ffcc29','#8b5cf6','#0d9488','#f97316'][st];
  const ey=egg?112:chick?100:96,top=egg?44:chick?54:52;let g='';
  if(st===7)g+=`<path d="M70 150 Q40 175 30 130 Q50 150 60 120 Q40 120 45 95 Q60 120 72 118Z" fill="#ef4444"/><path d="M130 150 Q160 175 170 130 Q150 150 140 120 Q160 120 155 95 Q140 120 128 118Z" fill="#ef4444"/><path d="M85 52 Q90 20 100 38 Q108 14 115 52Z" fill="#fbbf24"/>`;
  if(egg){g+=`<ellipse cx="100" cy="112" rx="56" ry="70" fill="${C}" stroke="#e8d3a8" stroke-width="3"/><circle cx="72" cy="80" r="7" fill="#f6cf8f"/><circle cx="128" cy="150" r="9" fill="#f6cf8f"/><circle cx="135" cy="88" r="5" fill="#f6cf8f"/>`;
    if(st===2)g+=`<path d="M58 125 L72 115 L82 128 L95 114 L106 127 L118 113 L130 126 L143 116" fill="none" stroke="#b08a4e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`}
  if(chick){g+=`<ellipse cx="100" cy="${st===3?104:110}" rx="${st===3?52:58}" ry="${st===3?52:60}" fill="${C}"/><path d="M95 52 Q100 34 104 52 Q112 40 110 56" fill="none" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>`;
    if(st===3)g+=`<path d="M42 130 L56 118 L68 132 L82 117 L96 131 L110 117 L124 132 L138 118 L152 130 L158 130 Q156 182 100 182 Q44 182 42 130Z" fill="#fff4dc" stroke="#e8d3a8" stroke-width="3"/>`;
    else g+=`<ellipse cx="48" cy="118" rx="12" ry="22" fill="#f5b800" transform="rotate(20 48 118)"/><ellipse cx="152" cy="118" rx="12" ry="22" fill="#f5b800" transform="rotate(-20 152 118)"/><path d="M84 168 v12 M78 180 h12 M116 168 v12 M110 180 h12" stroke="#f97316" stroke-width="4" stroke-linecap="round"/>`}
  if(bird){const L=st===5?'#c4b5fd':st===6?'#99f6e4':'#fed7aa';
    g+=`<path d="M100 150 Q70 190 60 175 Q78 168 84 150Z" fill="${C}"/><ellipse cx="100" cy="108" rx="56" ry="58" fill="${C}"/><ellipse cx="100" cy="128" rx="34" ry="32" fill="${L}"/><ellipse cx="46" cy="112" rx="13" ry="28" fill="${C}" stroke="rgb(0 0 0 / .12)" stroke-width="2" transform="rotate(18 46 112)"/><ellipse cx="154" cy="112" rx="13" ry="28" fill="${C}" stroke="rgb(0 0 0 / .12)" stroke-width="2" transform="rotate(-18 154 112)"/><path d="M84 166 v10 M116 166 v10" stroke="#f97316" stroke-width="4" stroke-linecap="round"/>`;
    if(st===6)g+=`<path d="M92 52 Q86 30 98 40 Q100 24 106 42 Q116 30 110 54Z" fill="#0f766e"/>`}
  if(mood==='sleep')g+=`<path d="M78 ${ey} q7 6 14 0 M108 ${ey} q7 6 14 0" fill="none" stroke="#1d1a26" stroke-width="3.5" stroke-linecap="round"/><text x="140" y="${top+6}" font-size="18" font-weight="900" fill="#8b5cf6">z</text><text x="152" y="${top-8}" font-size="13" font-weight="900" fill="#8b5cf6">z</text>`;
  else g+=`<circle cx="85" cy="${ey}" r="7" fill="#1d1a26"/><circle cx="115" cy="${ey}" r="7" fill="#1d1a26"/><circle cx="87.5" cy="${ey-2.5}" r="2.4" fill="#fff"/><circle cx="117.5" cy="${ey-2.5}" r="2.4" fill="#fff"/>`;
  if(!egg)g+=`<path d="M93 ${ey+9} L107 ${ey+9} L100 ${ey+19}Z" fill="#f97316"/>`;
  else if(mood==='happy')g+=`<path d="M90 ${ey+14} q10 10 20 0" fill="none" stroke="#1d1a26" stroke-width="3.5" stroke-linecap="round"/>`;
  else if(mood!=='sleep')g+=`<ellipse cx="100" cy="${ey+17}" rx="4" ry="5" fill="#1d1a26"/>`;
  if(mood==='happy')g+=`<ellipse cx="72" cy="${ey+12}" rx="8" ry="5" fill="#fb7185" opacity=".55"/><ellipse cx="128" cy="${ey+12}" rx="8" ry="5" fill="#fb7185" opacity=".55"/><path d="M40 60 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4Z" fill="#fbbf24"/><path d="M160 40 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3Z" fill="#fbbf24"/>`;
  if(acc&&mood!=='sleep'&&(acc.id==='gafas'||acc.id==='birrete'||acc.id==='corona'))g+=`<circle cx="85" cy="${ey}" r="12" fill="none" stroke="#1d1a26" stroke-width="3"/><circle cx="115" cy="${ey}" r="12" fill="none" stroke="#1d1a26" stroke-width="3"/><path d="M97 ${ey} h6" stroke="#1d1a26" stroke-width="3"/>`;
  if(acc&&acc.id==='birrete')g+=`<path d="M60 ${top+2} L100 ${top-16} L140 ${top+2} L100 ${top+20}Z" fill="#1d1a26"/><rect x="82" y="${top+6}" width="36" height="12" fill="#1d1a26"/><path d="M134 ${top+3} v18" stroke="#fbbf24" stroke-width="3"/><circle cx="134" cy="${top+23}" r="4" fill="#fbbf24"/>`;
  if(acc&&acc.id==='corona')g+=`<path d="M72 ${top+8} L76 ${top-18} L90 ${top-2} L100 ${top-24} L110 ${top-2} L124 ${top-18} L128 ${top+8}Z" fill="#fbbf24" stroke="#d97706" stroke-width="2"/><circle cx="100" cy="${top-4}" r="4" fill="#ef4444"/>`;
  let pre='';if(prem.includes('aura'))pre+=`<circle cx="100" cy="108" r="88" fill="none" stroke="#fbbf24" stroke-width="6" opacity=".55"/><circle cx="100" cy="108" r="80" fill="#fde68a" opacity=".25"/>`;if(prem.includes('capa'))pre+=`<path d="M52 110 Q30 175 70 186 L130 186 Q170 175 148 110Z" fill="#7c3aed" opacity=".9"/>`;
  if(prem.includes('bufanda'))g+=`<path d="M60 ${ey+28} Q100 ${ey+44} 140 ${ey+28} L140 ${ey+40} Q100 ${ey+56} 60 ${ey+40}Z" fill="#ef4444"/><path d="M118 ${ey+44} l8 30 l12 -4 l-6 -28Z" fill="#dc2626"/>`;
  return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="${esc(label)}">${pre}${g}</svg>`}
function frase(r){const h=[...today()].reduce((a,c)=>a+c.charCodeAt(0),0);const pick=a=>a[h%a.length].replace('{meta}',r.meta).replace('{pts}',r.pts).replace('{left}',Math.max(0,r.meta-r.pts));
  if(r.descanso&&!r.pts)return pick(['Hoy es tu día de descanso 😴 La racha no se rompe.','Descansar también es estudiar. ¡Mañana seguimos!']);
  if(r.hoy)return pick(['¡Llena! Hoy ya has cumplido 💜','Racha a salvo. Ahora, si quieres, descansa un poco','¡Qué orgullosa estoy de ti! Mañana más','Hoy me has cuidado genial. ¡Gracias!']);
  if(r.pts>0)return pick(['¡Ñam! Llevamos {pts} de {meta}. ¡Un poquito más!','Ya casi… me quedan {left} bocados','Me estoy poniendo fuerte, ¡sigue así!']);
  if(!r.n)return pick(['Zzz… despiértame con unas tarjetitas','Empezamos de cero, ¡pero juntas!','Un poquito hoy y me pongo a crecer 🥚']);
  return pick(['¿Hoy me das de comer? Me apetecen {meta} tarjetitas 🃏','Psst… que estoy aquí. ¿Unas preguntas?','Tengo hambre de temario 😋','Si estudias un poquito hoy, sigo creciendo 🌱'])}
function vMascota(){const r=R(),st=etapa(r.n),ac=accDe((S.rec||{}).acMax||0),mood=r.hoy?'happy':(!r.n&&!r.pts?'sleep':'wait');
  const sig=ETAPAS[st+1],pct=Math.min(100,Math.round(r.pts/r.meta*100)),nm=mascName();
  return `<div class="card mascard"><div class="masc">${mascSVG(st,ac,mood,150,nm+', tu mascota: '+ETAPAS[st].n+(ac?' con '+ac.n.toLowerCase():''))}</div>
  <div class="mtx"><div class="mhead"><b>${esc(nm)}</b><span class="mst">${esc(ETAPAS[st].n)}</span><button class="mini ghost" data-act="mascCfg" aria-expanded="${ui.mcfg?'true':'false'}">Ajustes</button></div>
  <p class="bubble">${esc(frase(r))}</p>
  <div class="meta"><div class="mbar" role="progressbar" aria-label="Meta de hoy" aria-valuemin="0" aria-valuemax="${r.meta}" aria-valuenow="${Math.min(r.pts,r.meta)}"><i style="width:${pct}%"></i></div><span>${Math.min(r.pts,r.meta)} / ${r.meta} puntos hoy${r.hoy?' ✓':''}</span></div>
  <div class="mstats"><span title="Días seguidos cumpliendo la meta">🔥 <b>${r.n}</b> ${r.n===1?'día':'días'}</span><span title="Cada escudo salva un día que no estudies">🛡️ <b>${r.esc}</b>/2 escudos</span>${r.descanso?'<span>😴 Hoy descansas</span>':''}</div>
  ${sig?`<p class="fine">${sig.d-r.n===1?'Mañana':`En ${sig.d-r.n} días`} se convierte en <b>${esc(sig.n.toLowerCase())}</b>.</p>`:'<p class="fine">¡Ha llegado a su forma final!</p>'}
  ${ui.mcfg?`<form class="mcfg" data-mcfg="1"><div class="fld"><label for="mname">Nombre de tu mascota</label><input id="mname" name="n" maxlength="16" value="${esc(nm)}" autocomplete="off"></div>
  <div class="fld" role="radiogroup" aria-labelledby="mmeta"><span id="mmeta" class="lbl">Meta diaria (puntos al día)</span><div class="seg">${[[10,'Suave','≈10 min'],[20,'Normal','≈20 min'],[40,'Intensa','≈40 min']].map(([m,t,d])=>`<label><input type="radio" name="m" value="${m}"${m===r.meta?' checked':''}><span><b>${m}</b><small>${t}</small><small>${d}</small></span></label>`).join('')}</div></div>
  <div class="fld" role="group" aria-labelledby="mdesc"><span id="mdesc" class="lbl">Días de descanso (no rompen la racha)</span><div class="days">${['L','M','X','J','V','S','D'].map((d,k)=>`<label><input type="checkbox" name="dd" value="${k}"${(((S.config||{}).descanso)||[]).includes(k)?' checked':''}><span aria-label="${DIAS[k]}">${d}</span></label>`).join('')}</div></div>
  <p class="fine">Cada tarjeta que clasificas o pregunta que respondes es 1 punto. Cada 7 días de racha ganas un escudo 🛡️ (máximo 2) que te salva un día que no puedas estudiar.</p>
  <div class="acts"><button class="btn">Guardar</button><button type="button" class="btn ghost" data-act="mascCfg">Cancelar</button></div></form>`:''}
  </div></div>`}
function vEvolucion(){const r=R(),st=etapa(r.n),mx=Math.max(st,(S.rec||{}).stMax||0),am=(S.rec||{}).acMax||0;
  const it=(svg,nom,sub,on,cur)=>`<li class="${on?'on':'off'}${cur?' cur':''}">${svg}<b>${esc(nom)}</b><small>${esc(sub)}</small>${cur?'<span class="ya">Ahora</span>':on?'':'<span class="lock" aria-hidden="true">🔒</span>'}</li>`;
  return `<div class="card evocard"><h3>Evolución de ${esc(mascName())}</h3><p class="sub">Crece con tu racha de días. Desliza para ver todas las formas →</p>
  <ul class="evo" aria-label="Formas de la mascota">${ETAPAS.map((e,k)=>it(mascSVG(k,null,k<=mx?'happy':'wait',76,e.n+(k<=mx?'':' (bloqueado)')),e.n,e.d?e.d+(e.d===1?' día':' días'):'Al empezar',k<=mx,k===st)).join('')}</ul>
  <h4 class="evo-h">Accesorios <small>· se ganan con aciertos seguidos en los tests (tu récord: ${am})</small></h4>
  <h4 class="evo-h">Premios de los retos <small>· estrellas: ${estrellas()}</small></h4><ul class="evo" aria-label="Premios">${PREMIOS.map(p=>it(mascSVG(4,null,'happy',76,p.n,[p.id]),p.n,p.s+' estrellas',estrellas()>=p.s,false)).join('')}</ul>
  <ul class="evo" aria-label="Accesorios">${ACCS.map(a=>it(mascSVG(4,a,'happy',76,a.n+(am>=a.a?'':' (bloqueado)')),a.n,a.a+' aciertos seguidos',am>=a.a,false)).join('')}</ul></div>`}
function celebrar(){if(!S.user||!S.ready||document.querySelector('.modal'))return;const r=R(),st=etapa(r.n),rec=S.rec||{};const am=rec.acMax||0,ac=accDe(am);
  let msg=null;
  if(rec.stMax==null){S.rec=Object.assign({},rec,{stMax:st,acSeen:ac?ac.id:null});kvSet('records');return}
  if(st>rec.stMax){msg={t:st===7?'¡Renace como fénix!':st===3?'¡Ha eclosionado!':'¡'+mascName()+' ha crecido!',d:`Ahora es ${ETAPAS[st].n.toLowerCase()}. Llevas ${r.n} días seguidos.`,svg:mascSVG(st,ac,'happy',160,ETAPAS[st].n)};S.rec=Object.assign({},rec,{stMax:st})}
  else if(ac&&ac.id!==rec.acSeen&&(!rec.acSeen||ACCS.findIndex(x=>x.id===ac.id)>ACCS.findIndex(x=>x.id===rec.acSeen))){msg={t:'¡Nuevo accesorio!',d:`${ac.n}: por ${ac.a} aciertos seguidos en los tests.`,svg:mascSVG(st,ac,'happy',160,ac.n)};S.rec=Object.assign({},rec,{acSeen:ac.id})}
  if(!msg)return;kvSet('records');const prev=document.activeElement;
  const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="mbox" role="dialog" aria-modal="true" aria-labelledby="mt">${msg.svg}<h2 id="mt">${esc(msg.t)}</h2><p>${esc(msg.d)}</p><button class="btn big2" data-close="1">¡Genial!</button></div>`;
  const close=()=>{m.remove();prev&&prev.focus&&prev.focus()};m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-close]'))close()});m.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='Tab'){e.preventDefault();if(e.key==='Escape')close()}});
  document.body.appendChild(m);m.querySelector('button').focus()}

/* ---------- plan diario ---------- */
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
function esDiaEstudio(d){const i=(d.getDay()+6)%7;if((((S.config||{}).descanso)||[]).includes(i))return false;if(hayHorario())return bloquesDia(i).some(b=>b.tipo==='estudio'||b.tipo==='repaso');return i<6}
function diasEstudioHasta(desde,hasta){let n=0;for(let d=new Date(desde);dkey(d)<=dkey(hasta);d=addD(d,1))if(esDiaEstudio(d))n++;return n}
function temasEnCurso(ref){const lun=(()=>{const d=new Date(ref);d.setDate(d.getDate()-((d.getDay()+6)%7));return dkey(d)})();return S.temas.filter(t=>t.semana&&t.semana<=lun&&t.estado!=='estudiado').sort((a,b)=>a.semana.localeCompare(b.semana)||ordT(a,b))}
function planDia(ref,sim){ // sim: avances supuestos (para mañana)
  sim=sim||{lect:{},cards:{}};const out=[];const day=new Date(ref);if(!esDiaEstudio(day))return {descanso:true,tareas:[]};
  const fin=addD(day,6-((day.getDay()+6)%7));const dl=Math.max(1,diasEstudioHasta(day,fin));
  const ts=temasEnCurso(day);
  ts.forEach(t=>{const atras=t.semana<monday();const dias=atras?Math.max(1,Math.min(dl,2)):dl;
    if(t.pags){const ini=t.pagIni||1;const leida=Math.max(ini-1,(sim.lect[t.id]!=null?sim.lect[t.id]:((S.lectura||{})[t.id]||ini-1)));const rest=t.pags-leida;if(rest>0){const n=Math.ceil(rest/dias);const a=leida+1,b=Math.min(t.pags,leida+n);out.push({k:'l-'+t.id+'-'+b,tipo:'lect',tema:t.id,a,b,txt:`📖 Lee y subraya las págs. ${a}–${b} del tema ${t.codigo}`,sub:`${b-a+1} páginas · te quedan ${rest} del tema`+(atras?' · atrasado':'')})}}
    const cs=S.cards[t.id]||[];const p=S.piles[t.id]||{};const nuevas=cs.filter(c=>!p[c.id]).length-(sim.cards[t.id]||0);if(nuevas>0){const n=Math.min(40,Math.ceil(nuevas/dias));out.push({k:'c-'+t.id+'-'+dkey(day),tipo:'cards',tema:t.id,n,txt:`🃏 Aprende ${n} tarjetas nuevas del tema ${t.codigo}`,sub:`quedan ${nuevas} sin estudiar`,go:'cards'})}
    else if(!cs.length&&!(S.pedidos||{})[t.id])out.push({k:'p-'+t.id,tipo:'pedir',tema:t.id,txt:`✨ Pide las tarjetas del tema ${t.codigo}`,sub:'Botón «Generar tarjetas» en Temas',go:'temas'})});
  const dudas=cardsDueHoy();
  if(dudas)out.push({k:'r-'+dkey(day),tipo:'rep',n:Math.min(30,dudas),txt:`🔁 Repasa ${Math.min(30,dudas)} tarjetas que tocan hoy`,sub:`repaso espaciado: ${dudas} pendientes para hoy`,go:'repaso'});
  const ne=errList().length;if(ne)out.push({k:'e-'+dkey(day),tipo:'err',txt:`❌ Haz «Mis errores» (${ne})`,sub:'hasta acertarlas dos veces seguidas',go:'errores'});
  const ultimo=diasEstudioHasta(addD(day,1),fin)===0;const t0=ts[0];
  if(ultimo&&t0)out.push({k:'t-'+dkey(day),tipo:'test',txt:`📝 Test de la semana: tema ${t0.codigo}`,sub:'10–20 preguntas para ver qué tal lo llevas',go:'test',tema:t0.id});
  else if((day.getDay()+6)%7===5)out.push({k:'s-'+dkey(day),tipo:'sim',txt:'🎯 Simulacro corto de lo estudiado',sub:'20 preguntas de los temas que ya tienes',go:'sim'});
  return {tareas:out,dl}}
function ritmo(){const objetivo=new Date(((S.config||{}).examen)||'2027-05-15');const hoy=new Date();const dias=diasEstudioHasta(hoy,objetivo);let pag=0;S.temas.forEach(t=>{if(t.estado!=='estudiado'&&t.pags)pag+=t.pags-Math.max(0,((S.lectura||{})[t.id]||(t.pagIni||1)-1))});return {dias,pag,pd:dias?Math.ceil(pag/dias):pag}}
function vHoyPlan(compact){const hoy=new Date(),man=addD(hoy,1);const H=planDia(hoy);const done=((S.diario||{})[today()])||{};
  const sim={lect:{},cards:{}};(H.tareas||[]).forEach(t=>{if(t.tipo==='lect')sim.lect[t.tema]=t.b;if(t.tipo==='cards')sim.cards[t.tema]=(sim.cards[t.tema]||0)+t.n});const M=planDia(man,sim);
  const li=(t,chk)=>`<li class="dt${chk&&done[t.k]?' ok':''}">${chk?`<label><input type="checkbox" data-dk="${esc(t.k)}"${done[t.k]?' checked':''}><span><b>${esc(t.txt)}</b><small>${esc(t.sub||'')}</small></span></label>${t.go?`<button class="mini" data-act="dgo" data-go="${t.go}" data-t="${esc(t.tema||'')}">Ir</button>`:''}`:`<span><b>${esc(t.txt)}</b><small>${esc(t.sub||'')}</small></span>`}</li>`;
  const hech=(H.tareas||[]).filter(t=>done[t.k]).length,tot=(H.tareas||[]).length;const R2=ritmo();
  return `<div class="card hoyplan"><h3>Hoy toca ${tot?`<small>${hech}/${tot} hechas</small>`:''}${ui.pomo?'':'<button class="mini hi" data-act="pomo" style="margin-left:auto">🍅 Pomodoro</button>'}</h3>${H.descanso?'<p class="empty">Hoy es día de descanso 😴</p>':tot?`<ul class="dlist">${H.tareas.map(t=>li(t,true)).join('')}</ul>`:'<p class="empty">¡Nada pendiente! Si te apetece, repasa tarjetas o haz un test.</p>'}
  ${compact?'':`<h3 style="margin-top:18px">Mañana</h3>${M.descanso?'<p class="fine">Mañana descansas 😴</p>':`<ul class="dlist">${(M.tareas||[]).map(t=>li(t,false)).join('')||'<li class="fine">Nada todavía</li>'}</ul>`}`}
  <p class="fine" style="margin-top:12px">🎯 Para tenerlo todo leído para mayo: <b>${R2.pd} páginas al día</b> (${R2.pag} páginas en ${R2.dias} días de estudio). Lo que no hagas hoy se reparte en los próximos días.</p></div>`}

/* ---------- repaso espaciado ---------- */
const SRS_INT=[1,3,7,14,30];
function srsDue(tema,c){const s=((S.srs||{})[tema]||{})[c.id];const p=(S.piles[tema]||{})[c.id];if(s)return s.d;if(p===1||p===2)return today();return null}
function cardsDueHoy(tema){const t=today();const ts=tema?[tema]:Object.keys(S.cards);let n=0;ts.forEach(tm=>(S.cards[tm]||[]).forEach(c=>{const d=srsDue(tm,c);if(d&&d<=t)n++}));return n}
function srsMark(tema,id,pile){const all=Object.assign({},S.srs||{});const m=Object.assign({},all[tema]||{});const prev=m[id]||{b:0};let b=pile===3?Math.min(SRS_INT.length,prev.b+1):pile===2?Math.max(1,Math.min(prev.b,1)):0;const days=pile===1?1:pile===2?2:SRS_INT[b-1];m[id]={b,d:dkey(addD(new Date(),days))};all[tema]=m;S.srs=all;kvSet('srs')}
/* ---------- stats del día ---------- */
function statAdd(k,n){const d=Object.assign({},S.diario||{});const t=Object.assign({},d[today()]||{});const s=Object.assign({c:0,q:0,p:0,m:0},t._s||{});s[k]+=n;t._s=s;d[today()]=t;S.diario=d;kvSet('diario')}
const hechasDe=o=>Object.keys(o||{}).filter(k=>k!=='_s');
/* ---------- retos semanales ---------- */
function semKey(d){const x=new Date(d||new Date());x.setDate(x.getDate()-((x.getDay()+6)%7));return dkey(x)}
function retos(){const lun=semKey(),dias=[0,1,2,3,4,5,6].map(k=>dkey(addD(new Date(lun+'T12:00:00'),k)));
  const st=dias.map(d=>((S.diario||{})[d]||{})._s||{});const sum=k=>st.reduce((a,s)=>a+(s[k]||0),0);
  const tests=S.res.filter(r=>(r.fecha||'').slice(0,10)>=lun).length;const metas=dias.filter(d=>d<=today()&&dayOk(d)).length;
  const R=[{id:'cards',t:'Clasifica 150 tarjetas',v:sum('c'),m:150,ic:'🃏'},{id:'tests',t:'Haz 3 tests o exámenes',v:tests,m:3,ic:'📝'},{id:'metas',t:'Cumple la meta 5 días',v:metas,m:5,ic:'🎯'},{id:'pomo',t:'Haz 8 pomodoros',v:sum('m'),m:8,ic:'🍅'}];
  return {lun,R}}
const PREMIOS=[{s:3,id:'bufanda',n:'Bufanda'},{s:8,id:'capa',n:'Capa de heroína'},{s:15,id:'aura',n:'Aura dorada'}];
function estrellas(){const h=(S.rec||{}).retos||{};return Object.values(h).reduce((a,x)=>a+x.length,0)}
function checkRetos(){if(!S.user||!S.ready)return;const {lun,R}=retos();const h=Object.assign({},(S.rec||{}).retos||{});const ya=h[lun]||[];const nuevos=R.filter(r=>r.v>=r.m&&!ya.includes(r.id));if(!nuevos.length)return;h[lun]=ya.concat(nuevos.map(r=>r.id));S.rec=Object.assign({},S.rec,{retos:h});kvSet('records');toast('⭐','¡Reto cumplido!',nuevos[0].t+' · +1 estrella')}
function premiosDe(){const e=estrellas();return PREMIOS.filter(p=>e>=p.s).map(p=>p.id)}
function vRetos(){const {R}=retos();const e=estrellas(),sig=PREMIOS.find(p=>e<p.s);
  return `<div class="card retos"><h3>Retos de la semana <small>⭐ ${e} estrellas</small></h3><div class="rlist2">${R.map(r=>`<div class="reto${r.v>=r.m?' ok':''}"><span class="ri" aria-hidden="true">${r.v>=r.m?'⭐':r.ic}</span><div><b>${esc(r.t)}</b><div class="tr" role="progressbar" aria-label="${esc(r.t)}" aria-valuemin="0" aria-valuemax="${r.m}" aria-valuenow="${Math.min(r.v,r.m)}"><i style="width:${Math.min(100,r.v/r.m*100)}%"></i></div><small>${Math.min(r.v,r.m)} / ${r.m}</small></div></div>`).join('')}</div>${sig?`<p class="fine">Con ${sig.s} estrellas ${esc(mascName())} consigue: <b>${esc(sig.n.toLowerCase())}</b>.</p>`:'<p class="fine">¡Tienes todos los premios!</p>'}</div>`}
/* ---------- pomodoro ---------- */
let pomoT=null;
function pomoStart(){const P=ui.pomo={fase:'estudio',fin:Date.now()+25*60000,n:(ui.pomo&&ui.pomo.n)||0};clearInterval(pomoT);pomoT=setInterval(pomoTick,1000);pomoDraw()}
function pomoStop(){clearInterval(pomoT);ui.pomo=null;pomoDraw()}
function pomoTick(){const P=ui.pomo;if(!P)return;if(Date.now()>=P.fin){if(P.fase==='estudio'){P.n++;statAdd('m',1);logAct(5);try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}toast('🍅','¡Pomodoro terminado!','+5 puntos · 5 minutos de descanso');P.fase='descanso';P.fin=Date.now()+5*60000}else{toast('📚','Fin del descanso','¡Otro pomodoro!');P.fase='estudio';P.fin=Date.now()+25*60000}}pomoDraw()}
function pomoDraw(){let w=document.getElementById('pomo');const P=ui.pomo;if(!P){if(w)w.remove();return}if(!w){w=document.createElement('div');w.id='pomo';w.setAttribute('role','timer');document.body.appendChild(w)}
  const l=Math.max(0,P.fin-Date.now()),m=Math.floor(l/60000),s=Math.floor(l%60000/1000);const r=R();
  w.className=P.fase;w.innerHTML=`<div class="pm">${mascSVG(etapa(r.n),accDe((S.rec||{}).acMax||0),P.fase==='estudio'?'wait':'happy',44,mascName(),premiosDe())}</div><div><small>${P.fase==='estudio'?'Estudiando con '+esc(mascName()):'Descanso'} · 🍅 ${P.n}</small><b aria-live="off">${m}:${String(s).padStart(2,'0')}</b></div><button class="mini ghost" data-act="pomostop" aria-label="Parar pomodoro">✕</button>`}
/* ---------- resumen y nota estimada ---------- */
function notaEstimada(){const rs=S.res.slice().sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')).filter(r=>r.total>=10).slice(0,5);if(!rs.length)return null;let w=0,s=0;rs.forEach((r,i)=>{const k=(5-i)*(r.total>=40?2:1);w+=k;s+=nota(r)*k});return s/w}
function vResumenDia(){const t=today();const s=((S.diario||{})[t]||{})._s||{};const hoyRes=S.res.filter(r=>(r.fecha||'').slice(0,10)===t);const H=planDia(new Date());const done=hechasDe((S.diario||{})[t]);const tot=(H.tareas||[]).length;
  const tarde=new Date().getHours()>=20;if(!tarde&&!(tot&&done.length>=tot))return '';
  const nt=hoyRes.length?hoyRes.reduce((a,r)=>a+nota(r),0)/hoyRes.length:null;
  const frase=done.length>=tot&&tot?'¡Día completo! Hoy has hecho todo lo que tocaba 💜':s.c||s.q?'Cada tarjeta cuenta. Mañana seguimos 💪':'Hoy no ha habido estudio… mañana empezamos con algo pequeño 🌱';
  return `<div class="card resumen"><h3>Resumen de hoy</h3><div class="rsum"><div><b>${s.c||0}</b><small>tarjetas</small></div><div><b>${s.q||0}</b><small>preguntas</small></div><div><b>${s.p||0}</b><small>páginas</small></div><div><b>${s.m||0}</b><small>pomodoros</small></div>${nt!=null?`<div><b>${n1(nt)}</b><small>nota de hoy</small></div>`:''}</div><p class="bubble" style="margin-bottom:0">${esc(mascName())}: ${esc(frase)}</p></div>`}

/* ---------- horario ---------- */
const DIAS=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const hoyIdx=()=>(new Date().getDay()+6)%7;
const mins=h=>{const [a,b]=h.split(':').map(Number);return a*60+b};
const HT={estudio:['Estudio','#6d28d9'],repaso:['Repaso','#a78bfa'],curso:['Curso','#2563eb'],trabajo:['Trabajo','#64748b'],comida:['Comida','#f59e0b'],descanso:['Descanso','#10b981'],planes:['Planes','#e11d48'],libre:['Libre','#94a3b8']};
function bloquesDia(i){const d=(S.horario.dias||[])[i];return d&&d.bloques?d.bloques:[]}
const hayHorario=()=>(S.horario.dias||[]).some(d=>d&&d.bloques&&d.bloques.length);
function setDia(i,bl){const dias=[0,1,2,3,4,5,6].map(k=>({bloques:bloquesDia(k).slice()}));dias[i].bloques=bl.slice().sort((a,b)=>a.h.localeCompare(b.h));S.horario=Object.assign({},S.horario,{dias});kvSet('horario')}
function plantilla(){const L=[{h:'17:00',f:'19:00',t:'Tema nuevo',tipo:'estudio'},{h:'19:15',f:'20:00',t:'Repaso con tarjetas',tipo:'repaso'}];
  const dias=[0,1,2,3,4,5,6].map(k=>({bloques:k<5?L.map(x=>Object.assign({},x)):k===5?[{h:'10:00',f:'12:00',t:'Repaso y test',tipo:'repaso'}]:[]}));S.horario={dias};kvSet('horario')}
function horasOpo(){let m=0;(S.horario.dias||[]).forEach(d=>(d.bloques||[]).forEach(b=>{if((b.tipo==='estudio'||b.tipo==='repaso')&&b.f){let x=mins(b.f==='00:00'?'24:00':b.f)-mins(b.h);if(x>0)m+=x}}));return m/60}
function blockRow(b,now){const T=HT[b.tipo]||HT.libre;const n=new Date();const cur=now&&mins(b.h)<=n.getHours()*60+n.getMinutes()&&n.getHours()*60+n.getMinutes()<mins(b.f==='00:00'?'23:59':b.f);
  return `<div class="blk-h${cur?' cur':''}" style="--bc:${T[1]}"><span class="hh">${esc(b.h)}${b.f&&b.f!=='23:59'?'–'+esc(b.f):''}</span><span class="bt"><b>${esc(b.t)}</b>${b.d?`<small>${esc(b.d)}</small>`:''}</span>${cur?'<span class="ahora">Ahora</span>':''}</div>`}
function vHorario(){const i=ui.hdia==null?hoyIdx():ui.hdia;
  const tabs=`<div class="dtabs">${DIAS.map((d,k)=>`<button class="${k===i?'on':''}" data-hdia="${k}" aria-pressed="${k===i}" aria-label="${d}">${d.slice(0,3)}</button>`).join('')}</div>`;
  if(!hayHorario()&&!ui.hedit)return `<div class="card hcard"><h3>Tu horario semanal</h3><p class="sub">Apunta cuándo trabajas, comes y estudias. Así sabrás cada día qué te toca.</p><div class="acts"><button class="btn" data-act="hedit">Crear mi horario</button><button class="btn ghost" data-act="hplant">Usar una plantilla</button></div></div>`;
  if(ui.hedit){const bl=bloquesDia(i);
    return `<div class="card hcard"><h3>Editar horario <button class="btn" data-act="hedit" style="margin-left:auto">Listo</button></h3>${tabs}
    <div class="tline">${bl.map((b,k)=>`<div class="blk-h" style="--bc:${(HT[b.tipo]||HT.libre)[1]}"><span class="hh">${esc(b.h)}${b.f?'–'+esc(b.f):''}</span><span class="bt"><b>${esc(b.t)}</b><small>${esc((HT[b.tipo]||HT.libre)[0])}</small></span><button class="x" data-act="hdel" data-i="${k}" aria-label="Borrar ${esc(b.t)}">✕</button></div>`).join('')||'<p class="empty">Este día está vacío.</p>'}</div>
    <form class="hform" data-hform="${i}"><label>Desde<input type="time" name="h" required value="17:00"></label><label>Hasta<input type="time" name="f" value="19:00"></label><label class="w">Qué haces<input name="t" required maxlength="40" placeholder="Estudiar tema nuevo"></label><label>Tipo<select name="tipo">${Object.entries(HT).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join('')}</select></label><button class="btn">Añadir</button></form>
    <div class="acts"><button class="mini" data-act="hcopy" data-i="${i}">Copiar el ${esc(DIAS[i].toLowerCase())} a lunes–viernes</button></div></div>`}
  return `<div class="card hcard"><h3>Tu horario <small style="font-weight:700;color:var(--muted)">· ${n1(horasOpo())} h de estudio a la semana</small><button class="mini" data-act="hedit" style="margin-left:auto">Editar</button></h3>${tabs}
  <div class="tline">${bloquesDia(i).map(b=>blockRow(b,i===hoyIdx())).join('')||'<p class="empty">Día libre</p>'}</div></div>`}

/* ---------- inicio ---------- */
function vInicio(){
  const T=S.temas;
  let nCards=0,sabe=0;Object.entries(S.cards).forEach(([t,cs])=>{const p=S.piles[t]||{};cs.forEach(c=>{nCards++;if(p[c.id]===3)sabe++})});
  const media=S.res.length?(S.res.reduce((a,r)=>a+nota(r),0)/S.res.length):null;
  const lun=monday();const sem=T.filter(t=>t.semana===lun);
  const cfg=S.config;let warn='';
  if(!cfg.inscrita){const lim=cfg.inscripcionHasta||'2026-12-29';const d=Math.ceil((new Date(lim+'T23:59:00')-new Date())/864e5);if(d>=0)warn=`<div class="warn"><span style="flex:1">Inscripción abierta: quedan <b>${d}</b> días.</span><button class="mini" data-act="inscrita">Ya me inscribí</button></div>`}
  const ne=errList().length,r=racha();
  const now=new Date().getHours()*60+new Date().getMinutes();
  const hoy=bloquesDia(hoyIdx());const cur=hoy.find(b=>mins(b.h)<=now&&now<mins(!b.f||b.f==='00:00'?'23:59':b.f));const next=hoy.filter(b=>mins(b.h)>now).slice(0,2);
  const nombre=(S.user&&S.user.displayName||'').split(' ')[0];
  const hoyHtml=hayHorario()?`<div class="tline">${(cur?[cur]:[]).concat(next).map(b=>blockRow(b,true)).join('')||'<p class="empty">No te queda nada más hoy. ¡A descansar!</p>'}</div><a class="more" href="#planning">Ver el día completo</a>`:`<p class="sub" style="margin:0 0 8px">Crea tu horario y aquí verás qué te toca en cada momento.</p><a class="btn ghost" href="#planning">Crear mi horario</a>`;
  return `${warn}<h2 class="hola">Hola${nombre?', '+esc(nombre):''} 👋</h2>${vMascota()}${vResumenDia()}${vHoyPlan(true)}
  <div class="card"><h3>Ahora</h3>${hoyHtml}</div>
  <div class="go"><a class="gob" href="#tarjetas" data-act="dgo" data-go="repaso"><span>🃏</span><b>Repasar tarjetas${cardsDueHoy()?` (${cardsDueHoy()} hoy)`:''}</b></a><a class="gob" href="#tests"><span>📝</span><b>Hacer un test</b></a>${ne?`<a class="gob" href="#tests"><span>🔁</span><b>Mis errores (${ne})</b></a>`:''}</div>
  <div class="kpis"><div class="kpi"><b>⏳ ${Math.max(0,Math.ceil((new Date((cfg.examen||'2027-05-15')+'T09:00:00')-new Date())/864e5))}</b><span>días ${cfg.examen?'para el examen':'hasta mayo (fecha sin publicar)'}</span></div><div class="kpi"><b>${nCards?Math.round(sabe/nCards*100)+'%':'–'}</b><span>tarjetas sabidas</span></div><div class="kpi"><b>${notaEstimada()==null?'–':n1(notaEstimada())}</b><span>nota estimada</span></div></div>${vRetos()}
`;
}
function vProgreso(){
  const T=S.temas,tot=T.length||34,est=T.filter(t=>t.estado==='estudiado').length,pct=Math.round(est/tot*100);
  const R=2*Math.PI*104,off=R*(1-est/tot);
  const blq=['I','II','III','IV'].map(b=>{const ts=T.filter(t=>t.bloque===b);return{b,n:ts.length,e:ts.filter(t=>t.estado==='estudiado').length}});
  const r=racha(),L=logros(),got=L.filter(x=>x.ok).length;
  return `<div class="hero"><div class="ring"><svg viewBox="0 0 240 240" role="img" aria-label="Temario estudiado ${pct}%"><circle cx="120" cy="120" r="104" fill="none" stroke="var(--line)" stroke-width="22"/><circle cx="120" cy="120" r="104" fill="none" stroke="var(--acc)" stroke-width="22" stroke-linecap="round" stroke-dasharray="${R}" stroke-dashoffset="${off}" transform="rotate(-90 120 120)"/></svg><div class="c"><b>${pct}%</b><span>${est} de ${tot} temas</span></div></div>
  <div><h2>Tu progreso</h2><div class="bars">${blq.map(x=>`<div class="bar"><div class="lab"><span>Bloque ${x.b}</span><span>${x.e}/${x.n}</span></div><div class="tr"><i style="width:${x.n?x.e/x.n*100:0}%;background:${BL[x.b].c}"></i></div></div>`).join('')}</div></div></div>
  <div class="grid" style="margin-bottom:16px"><div class="card"><div class="streak"><span class="fire">${r}</span><div><b>${r===1?'día':'días'} seguidos cumpliendo tu meta</b><small>${r?'Si un día fallas, un escudo te salva la racha':'Cumple la meta de hoy para empezar'}</small></div></div>${heat()}<p class="sub" style="margin:6px 0 0">Últimas 12 semanas</p></div>
  </div>${vEvolucion()}<div class="card" style="margin-top:16px"><h3>Logros · ${got} de ${L.length}</h3><div class="tr lgbar"><i style="width:${got/L.length*100}%"></i></div><p class="fine" style="margin:8px 0 4px">Toca un grupo para ver sus logros.</p>${[...new Set(L.map(x=>x.g))].map(g=>{const xs=L.filter(x=>x.g===g),k=xs.filter(x=>x.ok).length;return `<details class="lgd"><summary><span>${esc(g)}</span><small>${k} de ${xs.length}</small></summary><div class="badges">${xs.map(x=>`<span class="${x.ok?'on':''}"><em aria-hidden="true">${x.ok?esc(x.ic):'🔒'}</em><b>${esc(x.nom)}</b><small>${esc(x.des)}</small></span>`).join('')}</div></details>`}).join('')}</div>`}
function bestTest(tid){const r=S.res.filter(x=>x.tema===tid);return r.length?Math.max(...r.map(nota)):null}
function cardPct(tid){const cs=S.cards[tid]||[];const p=S.piles[tid]||{};const s=cs.filter(c=>p[c.id]===3).length;return cs.length?{n:cs.length,s}:null}
function rowTema(t){const b=BL[t.bloque]||BL.I;const cp=cardPct(t.id),bt=bestTest(t.id),nq=bank(t.id).length;
  const ped=(S.pedidos||{})[t.id];
  const pedTxt=ped?(Date.now()-ped<90*60000?'Generando… listas en 1 h aprox.':'En cola: se generan cuando tu ordenador esté encendido'):'';
  const acts=`<div class="acts">${cp?`<button class="mini" data-act="goCards" data-id="${esc(t.id)}">Tarjetas (${cp.n})</button>`:ped?`<span class="mini done">⏳ ${esc(pedTxt)}</span>`:`<button class="mini hi" data-act="pedir" data-id="${esc(t.id)}">Generar tarjetas</button>`}${nq?`<button class="mini" data-act="goTest" data-id="${esc(t.id)}">Test</button>`:''}</div>`;
  return `<div class="row trow"><span class="tag" style="background:${b.c}">${esc(t.codigo)}</span><div class="t"><b>${esc(t.titulo)}</b><small>${t.semana?'Semana del '+esc(fmtD(t.semana)):''}${cp?' · '+cp.s+'/'+cp.n+' tarjetas sabidas':''}${nq?' · '+nq+' preguntas':''}${bt!==null?' · mejor nota '+n1(bt):''}</small>${acts}</div><button class="pill p-${esc(t.estado||'pendiente')}" data-act="estado" data-id="${esc(t.id)}" aria-label="Cambiar estado">${ESTN[t.estado]||'Pendiente'}</button></div>`}
function vTemario(){
  if(!S.temas.length)return '<p class="empty">Todavía no hay temas cargados.</p>';
  const ped=Object.keys(S.pedidos||{}).filter(k=>S.pedidos[k]&&!(S.cards[k]||[]).length);
  const rec=Array.isArray(S.recursos)&&S.recursos.length?`<section class="blk recs"><h3>📎 Recursos extra <small>· solo los ves tú</small></h3>${S.recursos.map(g=>`<div class="card"><b>${esc(g.g)}</b>${g.d?`<p class="fine" style="margin:4px 0 8px">${esc(g.d)}</p>`:''}<div class="rlist">${(g.items||[]).map(it=>/^https:\/\//.test(it.u)?`<a href="${esc(it.u)}" target="_blank" rel="noopener"><b>${esc(it.t)}</b>${it.d?`<small>${esc(it.d)}</small>`:''}</a>`:'').join('')}</div></div>`).join('')}</section>`:'';
  return `<h2>Temario: 34 temas</h2><p class="sub">Tarjetas y test de cada tema. Si un tema no tiene, pulsa «Generar tarjetas» y en un rato aparecen solas.</p>${ped.length?`<div class="warn"><span style="flex:1">Generando tarjetas de: <b>${ped.map(k=>esc(k.replace('-','.'))).join(', ')}</b>. Tardan alrededor de 1 hora; vuelve a abrir la web para verlas.</span></div>`:''}`+['I','II','III','IV'].map(b=>{const ts=S.temas.filter(t=>t.bloque===b).sort(ordT);return `<section class="blk"><h3><span class="tag" style="background:${BL[b].c}">Bloque ${b}</span>${esc(BL[b].n)}</h3><div class="list">${ts.map(rowTema).join('')}</div></section>`}).join('')+rec;
}

/* ---------- tarjetas ---------- */
function temaCards(tema){const p=S.piles[tema]||{};return (S.cards[tema]||[]).map(c=>Object.assign({},c,{mz:tema,pile:p[c.id]||0,t:!!c.t}))}
function deckCards(){const t=today();return temaCards(ui.mazo).filter(c=>ui.filtro==='todas'||(ui.filtro==='hoy'&&(srsDue(ui.mazo,c)||'9')<=t)||(ui.filtro==='nueva'&&!c.pile)||(ui.filtro==='tipica'&&c.t)||String(c.pile)===ui.filtro)}
function vTarjetas(){
  if(!Object.keys(S.cards).length)return '<p class="empty">Aún no hay tarjetas.</p>';
  {const tc=temasConCartas();if(!tc.length)return '<p class="empty">Aún no hay tarjetas.</p>';if(!tc.find(t=>t.id===ui.mazo))ui.mazo=tc[0].id}
  const cs=temaCards(ui.mazo);
  const cnt=[0,0,0,0];cs.forEach(c=>cnt[c.pile]++);const tot=cs.length||1;const nt=cs.filter(c=>c.t).length;
  const list=deckCards();if(ui.idx>=list.length)ui.idx=0;const c=list[ui.idx];const b=temaBl(ui.mazo);
  return `<div class="study tar"><div class="tside"><h2>Tarjetas</h2><p class="sub hide-m">Toca la tarjeta para darle la vuelta y elige en qué montón va.</p>
  <div class="picker"><select id="mazo" aria-label="Tema">${temasConCartas().map(x=>`<option value="${esc(x.id)}"${x.id===ui.mazo?' selected':''}>${esc(x.titulo)}</option>`).join('')}</select>
  </div><div class="chips" role="group" aria-label="Qué tarjetas ver">${[['hoy','📅 Toca hoy',cardsDueHoy(ui.mazo),''],['todas','Todas',cs.length,''],...(nt?[['tipica','⭐ Típicas',nt,'']]:[]),['nueva','Nuevas',cnt[0],''],['1','No me la sé',cnt[1],'c1'],['2','Dudo',cnt[2],'c2'],['3','Me la sé',cnt[3],'c3']].map(([v,t,n,c])=>`<button class="chip2 ${c}${ui.filtro===v?' on':''}" data-filtro="${v}" aria-pressed="${ui.filtro===v}">${t} <b>${n}</b></button>`).join('')}</div>
  <div class="tbarw"><div class="stack3"><i style="width:${cnt[3]/tot*100}%;background:#22c55e"></i><i style="width:${cnt[2]/tot*100}%;background:#f59e0b"></i><i style="width:${cnt[1]/tot*100}%;background:#ef4444"></i></div></div>
  </div><div class="tmain">${c?`<div class="flip${ui.flip?' on':''}" id="flip" role="button" tabindex="0" aria-label="Girar tarjeta" style="--cc:${b.hex};--cl:${b.l}"><div class="fc"><div class="face f" aria-hidden="${!!ui.flip}">${c.t?'<span class="tp">Típica de examen</span>':''}<span class="n" aria-hidden="true">${esc(c.n||'')}</span><div class="em" aria-hidden="true">${esc(c.e||'')}</div><div class="q">${rich(c.q)}</div><span class="hint">Toca para ver la respuesta</span></div><div class="face b" aria-hidden="${!ui.flip}"><span class="n" aria-hidden="true">${esc(c.n||'')}</span><div class="a">${rich(c.a)}</div>${c.h?`<div class="h">${rich(c.h)}</div>`:''}</div></div></div>
  <div class="cnav"><button class="nb" data-act="prev" aria-label="Tarjeta anterior">‹</button><span>${ui.idx+1} / ${list.length}</span><button class="nb" data-act="next" aria-label="Tarjeta siguiente">›</button></div>
  <div class="piles"><button class="pl1" data-pile="1"><i aria-hidden="true">✗</i>No me la sé</button><button class="pl2" data-pile="2"><i aria-hidden="true">?</i>Dudo</button><button class="pl3" data-pile="3"><i aria-hidden="true">✓</i>Me la sé</button></div>`:'<p class="empty">No hay tarjetas en este montón.</p>'}</div></div>`;
}

/* ---------- tests ---------- */
function startRun(titulo,tema,preguntas,kind){if(!preguntas.length)return;ui.test={t:{id:kind,titulo,tema,preguntas},kind,i:0,ans:{},shown:{},t0:Date.now()};location.hash='tests';render();scrollTo(0,0)}
function vTests(){
  if(ui.ex)return vExam();
  const T=ui.test;
  if(T&&T.done)return vTestEnd();
  if(T){const q=T.t.preguntas[T.i];const ans=T.ans[T.i];const shown=T.shown[T.i];
    return `<div class="study"><div class="qhead"><span>${esc(T.t.titulo)}</span><span>${T.i+1} / ${T.t.preguntas.length}</span></div>${q.tema&&!T.t.tema?`<div class="qhead"><span>${esc(temaName(q.tema))}</span></div>`:''}<p class="qtext">${rich(q.q)}${q.tipico?'<span class="tip">Típica</span>':''}</p>
    <div role="radiogroup" aria-label="Opciones">${q.opts.map((o,k)=>{let cl='opt';if(shown){if(k===q.c)cl+=' ok';else if(k===ans)cl+=' ko'}else if(k===ans)cl+=' sel';return `<button class="${cl}" role="radio" aria-checked="${k===ans}" data-opt="${k}"${shown?' disabled':''}>${'abcd'[k]}) ${rich(o)}</button>`}).join('')}</div>
    <div aria-live="polite">${shown?`<div class="exp">${ans===q.c?'<b>¡Correcto!</b> ':ans==null?'<b>En blanco.</b> ':'<b>No era esa.</b> '}${rich(q.exp||'')}</div>`:''}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn ghost" data-act="tquit">Salir</button><span style="flex:1"></span>${shown?`<button class="btn" data-act="tnext">${T.i+1<T.t.preguntas.length?'Siguiente':'Ver nota'}</button>`:`<button class="btn ghost" data-act="tblank">Dejar en blanco</button><button class="btn" data-act="tcheck"${ans===undefined?' disabled':''}>Comprobar</button>`}</div></div>`}
  const all=bank(),tip=all.filter(q=>q.tipico),errs=errList(),ts=temasConBanco();
  if(!ui.scope||!ts.find(t=>t.id===ui.scope))ui.scope=ts.length?ts[0].id:'';
  const nScope=ui.scope?bank(ui.scope).length:0;
  const TB=[['web','✏️ Tests de la web','por tema'],['ofi','📄 Exámenes oficiales','completos'],['pre','🗂️ Preguntas oficiales','por tema'],['sim','🎯 Simulacros','mezclados']];
  const tabs=`<div class="xtabs" role="tablist">${TB.map(([k,t,d])=>`<button role="tab" aria-selected="${ui.xtab===k}" class="${ui.xtab===k?'on':''}" data-xtab="${k}"><b>${t}</b><small>${d}</small></button>`).join('')}</div>`;
  const head=`<h2>Exámenes y tests</h2><p class="sub">Cada fallo resta un tercio de acierto y las preguntas en blanco no restan. Lo que falles va a «Mis errores».</p>${tabs}${ui.xcfg?vExCfg():''}`;
  if(ui.xtab!=='web')return head+vExamenesHub(ui.xtab);
  return head+`<p class="sub">Preguntas hechas a partir de tus tarjetas, tema a tema. Cada pregunta se puede responder con lo que pone en las tarjetas.</p>
  <div class="modes">
   <button class="mode red" data-act="merr"${errs.length?'':' disabled'}><b>Mis errores</b><span>Como en la autoescuela: salen de aquí cuando las aciertas 2 veces seguidas.</span><span class="cnt">${errs.length}</span></button>
   <button class="mode" data-act="mtip"${tip.length?'':' disabled'}><b>Típicas de examen</b><span>Las preguntas que más caen, de todos los temas.</span><span class="cnt">${tip.length}</span></button>
   <button class="mode" data-act="msim"${all.length?'':' disabled'}><b>Mezcla de la web</b><span>${Math.min(40,all.length)} preguntas al azar de todos los temas con tarjetas.</span><span class="cnt">${all.length}</span></button>
  </div>
  <div class="card" style="margin-bottom:28px"><h3>Practicar un tema</h3><div class="picker"><select id="scope" aria-label="Tema">${ts.map(t=>`<option value="${esc(t.id)}"${t.id===ui.scope?' selected':''}>${esc(t.codigo+' · '+t.titulo)}</option>`).join('')}</select><button class="btn" data-act="mtema"${nScope?'':' disabled'}>10 preguntas al azar</button><button class="btn ghost" data-act="mtemaall"${nScope?'':' disabled'}>Todas (${nScope})</button></div></div>
  ${S.tests.length?`<h3>Tests guardados</h3><div class="list">${S.tests.slice().sort((a,b)=>(a.orden||0)-(b.orden||0)).map(t=>{const r=S.res.filter(x=>x.testId===t.id);const best=r.length?Math.max(...r.map(nota)):null;return `<div class="row"><div class="t"><b>${esc(t.titulo)}</b><small>${(t.preguntas||[]).length} preguntas${r.length?' · hecho '+r.length+(r.length>1?' veces':' vez')+' · mejor nota '+n1(best):' · sin hacer'}</small></div><button class="btn" data-act="tstart" data-id="${esc(t.id)}">${r.length?'Repetir':'Empezar'}</button></div>`}).join('')}</div>`:''}`;
}
function vTestEnd(){const T=ui.test,r=T.r;const n=nota(r);
  const fall=T.t.preguntas.map((q,i)=>({q,i,a:T.ans[i]})).filter(x=>x.a!==x.q.c);
  return `<div class="study"><h2>${esc(T.t.titulo)}</h2><div class="card" style="text-align:center"><div class="big" style="color:${n>=5?'var(--ok)':'var(--bad)'}">${n1(n)}</div><p style="margin:6px 0 0;font-weight:800">${r.aciertos} aciertos · ${r.fallos} fallos · ${r.blanco} en blanco</p><p class="sub" style="margin:4px 0 0">${T.saved?'Guardado en tus resultados':'Guardando…'}${fall.length?' · los fallos están en «Mis errores»':''}</p></div>
  ${fall.length?`<h3>Para repasar</h3><div class="list">${fall.map(x=>`<div class="row"><div class="t"><b>${rich(x.q.q)}</b><small>Correcta: ${rich(x.q.opts[x.q.c])}${x.q.exp?' — '+rich(x.q.exp):''}</small></div></div>`).join('')}</div>`:'<p class="empty">¡Sin fallos!</p>'}
  <div style="display:flex;gap:10px"><button class="btn ghost" data-act="tquit">Volver a los tests</button></div></div>`}

/* ---------- exámenes ---------- */
const yearOf=e=>(e.titulo.match(/OEP ([\d-]+)/)||[])[1]||e.fecha;
async function loadExams(){const idx=await getJ('data/examenes/index.json');if(!idx)return;S.exIdx=idx;await Promise.all(idx.map(async m=>{const e=await getJ(`data/examenes/${m.id}.json`);if(e)S.exams[m.id]=e}));if(!busy())render()}
function ofiQs(onlyP1){const out=[];idxOrder().forEach(m=>{const e=S.exams[m.id];if(!e)return;e.partes.forEach(p=>{if(onlyP1&&p.id!=='p1')return;p.preguntas.forEach(q=>{if(q.anulada||q.c<0)return;out.push(Object.assign({},q,{id:e.id+':'+q.id,src:e.titulo,anio:yearOf(e),bloque:q.bloque||(q.tema?q.tema.split('-')[0]:(p.bloques||[])[0]||null),tema:q.tema||null,sup:p.id!=='p1'?p.titulo:null,enun:p.id!=='p1'?p.enunciado:null,oficial:true}))})})});return out}
const idxOrder=()=>(S.exIdx||[]).slice();
const bOfT=t=>t?t.split('-')[0]:null;
function ownQs(){const o=[];Object.entries(S.preg).forEach(([t,a])=>a.forEach(q=>o.push(Object.assign({},q,{tema:t,bloque:bOfT(t)}))));return o}
function pista(q){const w=q.opts.map((_,i)=>i).filter(i=>i!==q.c);return w[[...String(q.id)].reduce((a,c)=>a+c.charCodeAt(0),0)%w.length]}
function startExam(cfg){const secs=[];let mins=null;
  if(cfg.kind==='oficial'){const e=S.exams[cfg.id];if(!e)return;const p1=e.partes[0];secs.push({titulo:'Primera parte',qs:p1.preguntas.filter(q=>!q.anulada&&q.c>=0).map(q=>Object.assign({},q,{id:e.id+':'+q.id,src:e.titulo}))});
    if(cfg.sup!=='no'){const s=e.partes.find(p=>(p.bloques||[])[0]===cfg.sup);if(s)secs.push({titulo:'Segunda parte · '+s.titulo+' (Bloque '+cfg.sup+')',enun:s.enunciado,qs:s.preguntas.filter(q=>!q.anulada&&q.c>=0).map(q=>Object.assign({},q,{id:e.id+':'+q.id,src:e.titulo}))})}}
  else if(cfg.kind==='gen'){const pool=shuffle(ofiQs(true).concat(ownQs()));const want={I:22,II:15,III:21,IV:22},seen=new Set(),qs=[];['I','II','III','IV'].forEach(b=>{pool.filter(q=>q.bloque===b).forEach(q=>{const k=plain(q.q).slice(0,60);if(want[b]>0&&!seen.has(k)){seen.add(k);qs.push(q);want[b]--}})});secs.push({titulo:'Primera parte',qs});
    if(cfg.sup!=='no'){const sups=[];Object.values(S.exams).forEach(e=>e.partes.forEach(p=>{if((p.bloques||[])[0]===cfg.sup)sups.push({e,p})}));if(sups.length){const {e,p}=sups[Math.floor(Math.random()*sups.length)];secs.push({titulo:'Segunda parte · Supuesto del Bloque '+cfg.sup+' ('+yearOf(e)+')',enun:p.enunciado,qs:p.preguntas.filter(q=>!q.anulada&&q.c>=0).map(q=>Object.assign({},q,{id:e.id+':'+q.id,src:e.titulo}))})}}}
  else{let pool=(cfg.fuente==='ofi'?[]:ownQs()).concat(ofiQs(true));if(cfg.tema)pool=pool.filter(q=>q.tema===cfg.tema);else if(cfg.bloque)pool=pool.filter(q=>q.bloque===cfg.bloque);const seen=new Set();pool=shuffle(pool).filter(q=>{const k=plain(q.q).slice(0,60);if(seen.has(k))return false;seen.add(k);return true}).slice(0,cfg.n||20);if(!pool.length){flash('No hay preguntas para esa selección');return}secs.push({titulo:cfg.titulo||'Simulacro',qs:pool})}
  const items=[];secs.forEach((s,si)=>s.qs.forEach(q=>items.push({q,s:si})));if(!items.length)return;
  if(cfg.tiempo==='oficial')mins=Math.round(items.length*1.2);
  ui.ex={titulo:cfg.titulo,kind:cfg.kind,secs,items,i:0,ans:{},dud:{},pis:{},shown:{},modo:cfg.modo||'final',pistas:cfg.pistas==='si',end:mins?Date.now()+mins*60000:null,mins,t0:Date.now(),done:false,conf:false,filt:'fallos'};ui.xcfg=null;
  clearInterval(exTimer);if(mins)exTimer=setInterval(exTick,1000);location.hash='tests';render();scrollTo(0,0)}
let exTimer=null;
function exTick(){const X=ui.ex;if(!X||X.done||!X.end){clearInterval(exTimer);return}const l=X.end-Date.now();if(l<=0){finishExam();return}const el=$('#xt');if(el)el.textContent=fmtT(l)}
const fmtT=ms=>{const s=Math.max(0,Math.round(ms/1000));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
function secScore(X,si,skipDud){let a=0,f=0,b=0;X.items.forEach((it,i)=>{if(it.s!==si)return;const v=X.ans[i];if(v==null||(skipDud&&X.dud[i]))b++;else if(v===it.q.c)a++;else f++});const n=a+f+b;return {a,f,b,n,nota:n?Math.max(0,a-f/3)/n*10:0}}
function finishExam(){const X=ui.ex;if(!X||X.done)return;clearInterval(exTimer);X.done=true;X.secsR=X.secs.map((_,si)=>secScore(X,si,false));X.secsD=X.secs.map((_,si)=>secScore(X,si,true));
  let a=0,f=0,b=0;X.secsR.forEach(r=>{a+=r.a;f+=r.f;b+=r.b});
  let sg=(S.rec||{}).acSeg||0,mx=(S.rec||{}).acMax||0;X.items.forEach((it,i)=>{const v=X.ans[i];if(v!=null){recordErr(it.q,v===it.q.c)}if(v===it.q.c){sg++;mx=Math.max(mx,sg)}else sg=0});S.rec=Object.assign({},S.rec,{acSeg:sg,acMax:mx});kvSet('records');kvSet('errores');
  statAdd('q',a+f);const r={titulo:X.titulo,fecha:new Date().toISOString(),aciertos:a,fallos:f,blanco:b,total:a+f+b,testId:'ex-'+X.kind,pistas:Object.keys(X.pis).length};S.res=S.res.concat([r]);kvSet('resultados');logAct(a+f);render();scrollTo(0,0)}
function vExam(){const X=ui.ex;if(X.done)return vExamEnd();const it=X.items[X.i],q=it.q,sec=X.secs[it.s],ans=X.ans[X.i],shown=X.modo==='momento'&&ans!=null,hid=X.pis[X.i];
  const first=X.items.findIndex(x=>x.s===it.s)===X.i;
  const grid=X.items.map((x,i)=>{let c='';if(X.modo==='momento'&&X.ans[i]!=null)c=X.ans[i]===x.q.c?'ok':'ko';else if(X.ans[i]!=null)c='an';return `<button class="g ${c}${X.dud[i]?' du':''}${i===X.i?' cur':''}" data-xgo="${i}" aria-label="Pregunta ${i+1}${X.ans[i]!=null?', respondida':''}${X.dud[i]?', dudosa':''}">${i+1}</button>`}).join('');
  const nAns=Object.keys(X.ans).length;
  return `<div class="exam"><div class="xtop"><b>${esc(X.titulo)}</b><span class="xmeta">${X.end?`<span aria-label="Tiempo restante">⏱ <span id="xt">${fmtT(X.end-Date.now())}</span></span>`:''}<span>${nAns}/${X.items.length} respondidas</span></span></div>
  <div class="xbody"><section class="xq">
  ${X.secs.length>1?`<p class="xsec">${esc(sec.titulo)}</p>`:''}${sec.enun?`<details class="enun"${first?' open':''}><summary>Enunciado del supuesto</summary><p>${esc(sec.enun)}</p></details>`:''}
  <p class="qn">Pregunta ${X.i+1}${X.kind!=='oficial'?` · <span class="srcq">${q.oficial?'Examen oficial OEP '+esc(q.anio):'Pregunta de la web'}</span>`:''}</p>
  ${q.sup&&!sec.enun?`<details class="enun"><summary>Enunciado: ${esc(q.sup)}</summary><p>${esc(q.enun||'')}</p></details>`:''}
  <p class="qtext" id="xqt">${rich(q.q)}</p>
  <div role="radiogroup" aria-labelledby="xqt">${q.opts.map((o,k)=>{if(hid===k&&!shown)return `<button class="opt off" disabled aria-label="${'abcd'[k]}) descartada por la pista">${'abcd'[k]}) <s>${rich(o)}</s></button>`;let cl='opt';if(shown){if(k===q.c)cl+=' ok';else if(k===ans)cl+=' ko'}else if(k===ans)cl+=' sel';return `<button class="${cl}" role="radio" aria-checked="${k===ans}" data-xopt="${k}"${shown?' disabled':''}>${'abcd'[k]}) ${rich(o)}</button>`}).join('')}</div>
  <div aria-live="polite">${shown?`<div class="exp">${ans===q.c?'<b>¡Correcto!</b> ':'<b>No era esa.</b> La buena es la '+'abcd'[q.c]+'). '}${rich(q.exp||'')}</div>`:''}</div>
  <div class="xact"><button class="mini${X.dud[X.i]?' hi':''}" data-act="xdud" aria-pressed="${!!X.dud[X.i]}">${X.dud[X.i]?'★ Dudosa':'☆ Marcar dudosa'}</button>${X.pistas&&!shown&&hid==null?`<button class="mini" data-act="xpis">💡 Pista</button>`:''}${ans!=null&&!shown?`<button class="mini ghost" data-act="xclr">Dejar en blanco</button>`:''}</div>
  <div class="xnav"><button class="btn ghost" data-act="xprev"${X.i?'':' disabled'}>‹ Anterior</button>${X.i+1<X.items.length?`<button class="btn" data-act="xnext">Siguiente ›</button>`:`<button class="btn" data-act="xfin">Entregar</button>`}</div>
  </section><aside class="xside"><h3>Preguntas</h3><div class="xgrid">${grid}</div><p class="fine">Morado: respondida · ★: dudosa</p><button class="btn ${X.conf?'':'ghost'}" data-act="xfin">${X.conf?'¿Seguro? Pulsa otra vez para entregar':'Entregar examen'}</button> <button class="mini ghost" data-act="xquit">Salir sin guardar</button></aside></div></div>`}
function vExamEnd(){const X=ui.ex;const R=X.secsR,D=X.secsD;const nd=Object.keys(X.dud).length;
  const cards=X.secs.map((s,si)=>`<div class="kpi"><b style="color:${R[si].nota>=5?'var(--ok)':'var(--bad)'}">${n1(R[si].nota)}</b><span>${esc(s.titulo)}<br>${R[si].a} bien · ${R[si].f} mal · ${R[si].b} en blanco</span>${nd?`<small class="fine">Sin contestar las dudosas: ${n1(D[si].nota)}</small>`:''}</div>`).join('');
  const L=X.items.map((it,i)=>({it,i,v:X.ans[i]})).filter(x=>X.filt==='todas'||(X.filt==='fallos'&&x.v!=null&&x.v!==x.it.q.c)||(X.filt==='dudosas'&&X.dud[x.i])||(X.filt==='blanco'&&x.v==null));
  const f=(k,t,n)=>`<button class="chip2${X.filt===k?' on':''}" data-xf="${k}" aria-pressed="${X.filt===k}">${t} <b>${n}</b></button>`;
  const cnt={fallos:X.items.filter((it,i)=>X.ans[i]!=null&&X.ans[i]!==it.q.c).length,dudosas:nd,blanco:X.items.filter((it,i)=>X.ans[i]==null).length,todas:X.items.length};
  let tip='';if(nd){const g=D.reduce((a,d,i)=>a+d.nota-R[i].nota,0);tip=`<p class="tipbox">${g>0.05?`💡 Si hubieras dejado en blanco las ${nd} preguntas dudosas, habrías sacado <b>más nota</b>. Cuando dudes de verdad, mejor en blanco.`:g<-0.05?`💪 Arriesgar en tus dudosas te salió bien: acertaste la mayoría.`:`Arriesgar o no en tus dudosas te habría dado lo mismo.`}</p>`}
  return `<div class="study wide"><h2>${esc(X.titulo)}</h2><p class="sub">Nota sobre 10 en cada parte, con la penalización del examen (cada fallo resta un tercio).${Object.keys(X.pis).length?` Usaste ${Object.keys(X.pis).length} pistas.`:''}</p><div class="kpis">${cards}</div>${tip}
  <div class="chips" role="group" aria-label="Qué preguntas ver">${f('fallos','Fallos',cnt.fallos)}${f('dudosas','★ Dudosas',cnt.dudosas)}${f('blanco','En blanco',cnt.blanco)}${f('todas','Todas',cnt.todas)}</div>
  <div class="list">${L.map(x=>{const q=x.it.q;return `<div class="row"><div class="t"><b>${x.i+1}. ${rich(q.q)}</b><small>${x.v!=null?`Tu respuesta: ${'abcd'[x.v]}) ${rich(q.opts[x.v])} ${x.v===q.c?'✓':'✗'}<br>`:'En blanco<br>'}Correcta: ${'abcd'[q.c]}) ${rich(q.opts[q.c])}${q.exp?' — '+rich(q.exp):''}</small></div></div>`}).join('')||'<p class="empty">Nada en esta lista.</p>'}</div>
  <p class="fine">Los fallos se han guardado en «Mis errores».</p><button class="btn" data-act="xquit">Volver a exámenes</button></div>`}
function vExCfg(){const c=ui.xcfg;const seg=(name,opts,val)=>`<div class="seg seg-s">${opts.map(([v,t,d])=>`<label><input type="radio" name="${name}" value="${v}"${v===val?' checked':''}><span><b>${t}</b>${d?`<small>${d}</small>`:''}</span></label>`).join('')}</div>`;
  const ts=S.temas.slice().sort(ordT);
  return `<form class="card xcfg" data-xcfg="1"><h3>${esc(c.titulo)}</h3>
  ${c.kind==='sim'?`<div class="fld"><label for="xb">Bloque</label><select id="xb" name="bloque"><option value="">Todos los bloques</option>${['I','II','III','IV'].map(b=>`<option value="${b}"${c.bloque===b?' selected':''}>Bloque ${b} · ${esc(BL[b].n)}</option>`).join('')}</select></div>
  <div class="fld"><label for="xtm">Tema (opcional)</label><select id="xtm" name="tema"><option value="">Todos los temas del bloque</option>${ts.map(t=>`<option value="${t.id}"${c.tema===t.id?' selected':''}>${esc(t.codigo+' · '+t.titulo)}</option>`).join('')}</select></div>
  <div class="fld"><span class="lbl">Número de preguntas</span>${seg('n',[[10,'10'],[20,'20'],[40,'40'],[80,'80']],c.n||20)}</div>
  <div class="fld"><span class="lbl">Preguntas</span>${seg('fuente',[['todas','Todas','oficiales y de la web'],['ofi','Solo de exámenes','oficiales']],c.fuente||'todas')}</div>`:''}
  ${c.kind!=='sim'?`<div class="fld"><span class="lbl">Segunda parte (supuesto práctico)</span>${seg('sup',[['III','Supuesto de desarrollo','Bloque III (II+III en 2026)'],['IV','Supuesto de sistemas','Bloque IV (II+IV en 2026)'],['no','Sin supuesto','solo 1.ª parte']],c.sup||'III')}</div>`:''}
  <div class="fld"><span class="lbl">Corrección</span>${seg('modo',[['final','Al final','como el examen'],['momento','Según respondo','ves si aciertas']],c.modo||'final')}</div>
  <div class="fld"><span class="lbl">Tiempo</span>${seg('tiempo',[['oficial','Con reloj','1,2 min por pregunta'],['libre','Sin límite','']],c.tiempo||'oficial')}</div>
  <div class="fld"><span class="lbl">Pistas</span>${seg('pistas',[['no','Sin pistas',''],['si','Con pistas','descarta una opción mala']],c.pistas||'no')}</div>
  <div class="acts"><button class="btn">Empezar</button><button type="button" class="btn ghost" data-act="xcancel">Cancelar</button></div></form>`}
function vExamenesHub(tab){const ofi=ofiQs(true);const per={};ofi.forEach(q=>{const k=q.tema||q.bloque;per[k]=(per[k]||0)+1});
  const exs=idxOrder().filter(m=>S.exams[m.id]);
  if(tab==='ofi')return `<p class="sub">Tal cual salieron, con la plantilla oficial de respuestas. Ojo: hasta 2025 el supuesto era del Bloque III o del IV; en 2026 es II+III o II+IV.</p>
  <div class="xlist">${exs.map(m=>{const e=S.exams[m.id];const r=S.res.filter(x=>x.titulo===e.titulo);const best=r.length?Math.max(...r.map(nota)):null;return `<div class="card xe"><b>${esc(e.titulo)}</b><small>${e.partes[0].preguntas.length} + 20 preguntas · plantilla ${esc(e.plantilla.split(' ')[0])}${best!=null?' · mejor nota '+n1(best):''}</small><div class="acts"><button class="btn" data-act="xcfg" data-k="oficial" data-id="${esc(e.id)}">Hacer examen</button><a class="mini ghost" href="${esc(e.fuente)}" target="_blank" rel="noopener">PDF oficial</a></div></div>`}).join('')||'<p class="empty">Cargando exámenes…</p>'}</div>
`;
  if(tab==='sim')return `<p class="sub">Mezclan preguntas de exámenes oficiales y de la web.</p><div class="modes">
   <button class="mode" data-act="xcfg" data-k="gen"><b>Examen completo</b><span>80 preguntas repartidas por bloques, como el real, más un supuesto práctico. Se mezclan preguntas oficiales y de la web.</span></button>
   <button class="mode" data-act="xcfg" data-k="sim"><b>A tu medida</b><span>Eliges bloque o tema, cuántas preguntas, tiempo, pistas y cuándo corregir.</span></button></div>`;
  return `<p class="sub">${ofi.length} preguntas de la primera parte de ${exs.length} exámenes, clasificadas por tema de forma automática (puede haber alguna mal colocada). Toca uno para practicarlo.</p>
  ${['I','II','III','IV'].map(b=>`<div class="ofib"><b>Bloque ${b}</b><div class="chips wrap">${S.temas.filter(t=>t.bloque===b).sort(ordT).map(t=>per[t.id]?`<button class="chip2" data-act="xofi" data-t="${t.id}">${esc(t.codigo)} <b>${per[t.id]}</b></button>`:'').join('')}<button class="chip2" data-act="xofi" data-b="${b}">Todo el bloque <b>${ofi.filter(q=>q.bloque===b).length}</b></button></div></div>`).join('')}`}

/* ---------- juegos ---------- */
function vJuegos(){
  const G=ui.game;
  const ts=temasConBanco(),ms=temasConCartas();
  if(G&&G.kind==='vf')return vVF();
  if(G&&G.kind==='emp')return vEmp();
  const rec=S.rec||{};
  return `<h2>Juegos</h2><p class="sub">Para repasar jugando, en ratos cortos.</p>
  <div class="grid">
   <div class="card"><h3>⚡ Verdadero o falso exprés</h3><p>60 segundos. Te enseño una pregunta con una respuesta: ¿es la buena? Cada fallo te quita 5 segundos.</p><p class="sub">Récord: <b>${rec.vf||0}</b> aciertos</p><div class="picker"><select id="gvf" aria-label="Tema del juego"><option value="">Todos los temas</option>${ts.map(t=>`<option value="${esc(t.id)}">${esc(t.codigo+' · '+t.titulo)}</option>`).join('')}</select><button class="btn" data-act="gvf"${bank().length?'':' disabled'}>Jugar</button></div></div>
   <div class="card"><h3>🧩 Empareja</h3><p>Une cada pregunta con su respuesta. 6 parejas por ronda, lo más rápido que puedas.</p><p class="sub">Récord: <b>${rec.emp?n1(rec.emp)+' s':'–'}</b></p><div class="picker"><select id="gemp" aria-label="Mazo del juego">${ms.map(m=>`<option value="${esc(m.id)}">${esc(m.titulo)}</option>`).join('')}</select><button class="btn" data-act="gemp"${ms.length?'':' disabled'}>Jugar</button></div></div>
  </div>`}
function vfNext(){const G=ui.game;const q=G.pool[Math.floor(Math.random()*G.pool.length)];const truth=Math.random()<.5;let k=q.c;if(!truth){const o=q.opts.map((_,i)=>i).filter(i=>i!==q.c);k=o[Math.floor(Math.random()*o.length)]}G.cur={q,k,truth:k===q.c};G.fb=''}
function vVF(){const G=ui.game;const left=Math.max(0,Math.ceil((G.end-Date.now())/1000));
  if(G.over)return `<div class="study"><h2>¡Tiempo!</h2><div class="card" style="text-align:center"><div class="big">${G.ok}</div><p style="font-weight:800">aciertos · ${G.ko} fallos${G.rec?' · ¡nuevo récord!':''}</p></div>${G.miss.length?`<h3>Las que fallaste</h3><div class="list">${G.miss.map(x=>`<div class="row"><div class="t"><b>${rich(x.q)}</b><small>Correcta: ${rich(x.opts[x.c])}</small></div></div>`).join('')}</div>`:''}<div style="display:flex;gap:10px"><button class="btn ghost" data-act="gquit">Salir</button><button class="btn" data-act="gvfagain">Otra vez</button></div></div>`;
  const c=G.cur;return `<div class="study game"><div class="gtop"><button class="mini ghost" data-act="gquit">✕ Salir</button><span class="gok">✓ ${G.ok}</span></div><div class="timer"><span id="gt">${left} s</span><div class="tbar" aria-hidden="true"><i style="width:${left/60*100}%"></i></div></div><div class="stmt"><small class="fine">¿Es correcta esta respuesta?</small>${rich(c.q.q)}<span class="o">${rich(c.q.opts[c.k])}</span></div>${G.fb?`<div class="exp">${G.fb}</div>`:''}<div class="vf"><button class="v" data-act="vfv">✓ Verdadero</button><button class="f" data-act="vff">✗ Falso</button></div></div>`}
function empNew(){const G=ui.game;const cs=shuffle(temaCards(G.mazo)).slice(0,6);G.cards=cs;G.left=shuffle(cs.map(c=>c.id));G.right=shuffle(cs.map(c=>c.id));G.done=new Set();G.sel=null;G.bad=null;G.errs=0;G.t0=Date.now();G.over=false}
function vEmp(){const G=ui.game;const by=id=>G.cards.find(c=>c.id===id);
  if(G.over)return `<div class="study"><h2>¡Hecho!</h2><div class="card" style="text-align:center"><div class="big">${n1(G.secs)} s</div><p style="font-weight:800">${G.errs} errores${G.rec?' · ¡nuevo récord!':''}</p></div><div style="display:flex;gap:10px"><button class="btn ghost" data-act="gquit">Salir</button><button class="btn" data-act="gempagain">Otra ronda</button></div></div>`;
  return `<div class="study game"><div class="gtop"><button class="mini ghost" data-act="gquit">✕ Salir</button><span class="gok">${G.done.size} / ${G.cards.length}</span></div><p class="fine" style="margin:0">Toca una pregunta y luego su respuesta.</p><div class="match"><div class="mcol"><h3>Preguntas</h3>${G.left.map(id=>`<button class="${G.done.has(id)?'done':G.sel===id?'sel':G.bad==='l'+id?'bad':''}" data-ml="${esc(id)}"${G.done.has(id)?' disabled':''}>${esc(plain(by(id).q))}</button>`).join('')}</div><div class="mcol"><h3>Respuestas</h3>${G.right.map(id=>`<button class="${G.done.has(id)?'done':G.bad==='r'+id?'bad':''}" data-mr="${esc(id)}"${G.done.has(id)?' disabled':''}>${esc(plain(by(id).a))}</button>`).join('')}</div></div></div>`}


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
  const PT=[['hoy','📌 Hoy'],['sem','📅 Semana'],['mes','🗓️ Mes'],['hor','⏰ Horario']];if(!ui.ptab)ui.ptab='hoy';
  const tabs=`<div class="ptabs" role="tablist">${PT.map(([k,t])=>`<button role="tab" aria-selected="${ui.ptab===k}" class="${ui.ptab===k?'on':''}" data-ptab="${k}">${t}</button>`).join('')}</div>`;
  let body='';
  if(ui.ptab==='hoy')body=vHoyPlan(false);
  else if(ui.ptab==='hor')body=vHorario();
  else if(ui.ptab==='sem'){const ts=S.temas.filter(t=>t.semana===lun);const prog=t=>{const ini=t.pagIni||1;const l=Math.max(0,((S.lectura||{})[t.id]||ini-1)-ini+1),tot=Math.max(1,t.pags-ini+1);const cp=cardPct(t.id);return `<div class="row"><span class="tag" style="background:${BL[t.bloque].c}">${esc(t.codigo)}</span><div class="t"><b>${esc(t.titulo)}</b>${t.pags?`<div class="pbar"><span>📖 Lectura</span><div class="tr"><i style="width:${Math.min(100,l/tot*100)}%"></i></div><small>${Math.min(l,tot)}/${tot} págs.</small></div>`:''}${cp?`<div class="pbar"><span>🃏 Tarjetas</span><div class="tr"><i style="width:${cp.s/cp.n*100}%;background:#22c55e"></i></div><small>${cp.s}/${cp.n}</small></div>`:''}</div><button class="pill p-${esc(t.estado||'pendiente')}" data-act="estado" data-id="${esc(t.id)}">${ESTN[t.estado]||'Pendiente'}</button></div>`};
    const dias=[0,1,2,3,4,5,6].map(k=>{const d=addD(new Date(lun+'T12:00:00'),k);const dk=dkey(d);const est=esDiaEstudio(d);const hechas=hechasDe((S.diario||{})[dk]).length;return `<div class="wd${dk===today()?' cur':''}${est?'':' rest'}"><b>${DIAS[k].slice(0,3)}</b><small>${d.getDate()}</small><span>${!est?'😴':dayOk(dk)?'✅':hechas?'◐':'·'}</span></div>`}).join('');
    body=`<div class="card"><h3>Esta semana</h3><div class="wdays">${dias}</div><p class="fine">✅ meta cumplida · ◐ empezado · 😴 descanso</p></div>
    <h3 class="hsec">Temas de la semana</h3>${ts.length?`<div class="list">${ts.map(prog).join('')}</div>`:'<p class="empty">Esta semana no hay temas nuevos: toca repasar.</p>'}
    ${cur?`<details class="mes nocap" style="margin-top:16px"><summary>Tareas del plan de esta semana</summary>${wk(cur)}</details>`:''}`}
  else{const mesAct=new Date().toLocaleDateString('es-ES',{month:'long',year:'numeric'}).replace(' de ',' ');
    body=`<p class="sub">Qué temas tocan cada mes hasta el examen. Toca un mes para ver sus semanas.</p>${Object.entries(byMonth).map(([m,ws])=>{const cods=[...new Set(S.temas.filter(t=>ws.some(w=>w.lunes===t.semana)).map(t=>t.codigo))];const ph=[...new Set(ws.map(w=>(fases.find(x=>x.id===w.fase)||{}).corto||(w.fase==='rep'?'Repaso':'')).filter(Boolean))];return `<details class="mes"${m===mesAct?' open':''}><summary><span>${esc(m)}${m===mesAct?' · este mes':''}</span><small>${cods.length?cods.join(' · '):ph.join(' · ')}</small></summary>${ws.map(wk).join('')}</details>`}).join('')}`}
  return `<h2>Planning</h2>${tabs}${body}`;
}

/* ---------- resultados ---------- */
function vResultados(){
  if(!S.res.length)return vProgreso()+'<p class="empty">Cuando hagas tests, tus notas aparecerán aquí.</p>';
  const rs=S.res.slice().sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
  return vProgreso()+`<h2>Tus notas</h2><p class="sub">Nota sobre 10 de cada test, con la penalización del examen.</p><div class="card"><div class="fig" id="chart"><svg id="chs"></svg></div></div>
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
function vPortada(){
  const F=[['🃏','Tarjetas visuales','Una idea por tarjeta, con emoji y lo importante en negrita. Las vas dejando en «No me la sé», «Dudo» o «Me la sé».'],['📝','Tests como el examen','Preguntas con trampa, nota sobre 10 y la penalización de verdad: cada fallo resta un tercio.'],['🔁','Mis errores','Lo que fallas vuelve a salir hasta que lo aciertas dos veces seguidas, como en la autoescuela.'],['🗓️','Tu horario y tu plan','Organiza tu semana y sigue un plan con vueltas de repaso hasta el examen.'],['🔥','Racha y logros','Más de 40 logros y tu racha de días para no perder el ritmo.'],['📱','Móvil y ordenador','Entra con Google y tu progreso está en los dos, siempre al día.']];
  const temasC=S.temasBase.filter(t=>t.tarjetas).length;let nC=0;Object.values(S.cards).forEach(c=>nC+=c.length);
  return `<section class="pt-hero"><span class="kick">Oposición TAI · Técnico Auxiliar de Informática</span><h2>Estudia la TAI sin agobios, un poco cada día</h2><p class="sub">Tarjetas para memorizar, tests con trampa y tu propio plan de estudio. Gratis, en el móvil y en el ordenador.</p>
  <div class="acts pt-cta"><a class="btn big2" href="#entrar">Empezar gratis</a><a class="btn ghost big2" href="#probar">Probar sin cuenta</a></div>
  <div class="pt-nums"><div><b>34</b><span>temas del programa</span></div><div><b>${nC||'+200'}</b><span>tarjetas ya hechas</span></div><div><b>${temasC}</b><span>temas con tarjetas (y subiendo)</span></div></div></section>
  <h3 class="pt-h">Qué tienes dentro</h3><div class="pt-feat">${F.map(f=>`<div class="card"><span class="pt-ic" aria-hidden="true">${f[0]}</span><b>${esc(f[1])}</b><p>${esc(f[2])}</p></div>`).join('')}</div>
  <h3 class="pt-h">Cómo funciona</h3><ol class="pt-steps"><li><b>Entra con tu cuenta de Google.</b> No hay contraseñas nuevas que recordar.</li><li><b>Crea tu horario</b> o usa la plantilla, y mira qué te toca cada día.</li><li><b>Estudia con tarjetas y haz tests.</b> La web guarda lo que sabes y lo que fallas.</li></ol>
  <h3 class="pt-h">El examen, en resumen</h3><div class="card pt-exam"><ul><li><b>Primera parte:</b> 80 preguntas tipo test.</li><li><b>Segunda parte:</b> un supuesto práctico de 20 preguntas. En la convocatoria 2026 eliges entre uno de los Bloques II y III o uno de los Bloques II y IV (antes era Bloque III o Bloque IV).</li><li><b>Tiempo:</b> 120 minutos en total.</li><li><b>Penalización:</b> cada respuesta mal resta un tercio de una bien.</li></ul><p class="fine">Datos orientativos: consulta siempre la convocatoria oficial en el BOE.</p></div>
  <h3 class="pt-h">Preguntas frecuentes</h3><div class="pt-faq"><details><summary>¿Cuesta dinero?</summary><p>No, es gratis.</p></details><details><summary>¿Quién ve mis datos?</summary><p>Tu progreso y tu horario solo los ves tú. Para identificar tu cuenta se guardan tu nombre y tu correo de Google y la fecha de tu último acceso; no se comparten con nadie.</p></details><details><summary>¿Sustituye a la academia?</summary><p>No: es una ayuda para repasar y organizarte. El temario completo lo tienes en tus apuntes.</p></details><details><summary>¿Es una web oficial?</summary><p>No. No tiene relación con el INAP ni con ninguna administración.</p></details></div>
  <div class="pt-final card"><b>¿Empezamos?</b><a class="btn big2" href="#entrar">Entrar con Google</a></div>`}
function vProbar(){const cs=(S.cards['I-1']||[]).filter(c=>c.t).slice(0,5),qs=(S.preg['I-1']||[]).filter(q=>q.tipico).slice(0,5);
  if(!cs.length)return '<p class="empty">Cargando…</p>';
  const D=ui.demo=ui.demo||{i:0,flip:false,q:0,ans:[]};const c=cs[D.i%cs.length],b=BL.I;
  let test;if(D.q<qs.length){const q=qs[D.q],a=D.ans[D.q];test=`<p class="fine">Pregunta ${D.q+1} de ${qs.length}</p><p class="dq">${rich(q.q)}</p>${q.opts.map((o,k)=>`<button class="opt${a!=null?(k===q.c?' ok':k===a?' ko':''):''}" data-dopt="${k}"${a!=null?' disabled':''}>${rich(o)}</button>`).join('')}${a!=null?`<p class="sub">${rich(q.exp||'')}</p><button class="btn" data-dnext="1">${D.q+1<qs.length?'Siguiente':'Ver resultado'}</button>`:''}`}
  else{const ok=D.ans.filter((a,k)=>a===qs[k].c).length;test=`<div class="dres"><b>${ok} de ${qs.length}</b><p>${ok>=4?'¡Muy bien!':'Con las tarjetas lo vas a fijar.'} Entra para guardar tu progreso y hacer tests completos.</p><a class="btn" href="#entrar">Empezar gratis</a> <button class="btn ghost" data-dreset="1">Repetir</button></div>`}
  return `<h2>Pruébalo sin cuenta</h2><p class="sub">5 tarjetas y 5 preguntas del tema 1 (Constitución). Aquí no se guarda nada.</p>
  <div class="grid"><div class="card"><h3>Tarjetas</h3><div class="flip${D.flip?' on':''}" id="dflip" role="button" tabindex="0" aria-label="Girar tarjeta" style="--cc:${b.hex};--cl:${b.l}"><div class="fc"><div class="face f" aria-hidden="${!!D.flip}"><span class="tp">Típica de examen</span><div class="em" aria-hidden="true">${esc(c.e||'')}</div><div class="q">${rich(c.q)}</div><span class="hint">Toca para ver la respuesta</span></div><div class="face b" aria-hidden="${!D.flip}"><div class="a">${rich(c.a)}</div>${c.h?`<div class="h">${rich(c.h)}</div>`:''}</div></div></div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px"><button class="btn ghost" data-dcard="-1">Anterior</button><span class="fine">${D.i%cs.length+1} de ${cs.length}</span><button class="btn ghost" data-dcard="1">Siguiente</button></div></div>
  <div class="card"><h3>Mini test</h3>${test}</div></div>
  <div class="pt-final card"><b>¿Te gusta? Hay muchas más tarjetas y tests.</b><a class="btn big2" href="#entrar">Empezar gratis</a></div>`}
function vLogin(){return `<div class="login"><div class="lg-ico">📚</div><h2>Tu agenda para la oposición TAI</h2><p class="sub">Tarjetas para memorizar, tests con trampa, tu horario y tu progreso. Todo en un sitio, en el móvil y en el ordenador.</p>
  <button class="btn big" data-act="login"><svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Entrar con Google</button>
  <p class="fine">Cada persona tiene su propio progreso y su horario. Solo tú puedes verlos.</p><p><a href="#inicio" class="more">← Volver a la portada</a></p></div>`}
function busy(){return (ui.ex&&!ui.ex.done)||(ui.test&&!ui.test.done)||(ui.game&&!ui.game.over)}
function render(){S.temas=S.temasBase.map(t=>Object.assign({},t,{estado:(S.estados||{})[t.id]||'pendiente'}));const v=view();acct();document.querySelectorAll('#nav a').forEach(a=>{const on=a.dataset.v===v;a.classList.toggle('on',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  const gate=!!window.FIREBASE_CONFIG&&!S.user;document.body.classList.toggle('out',gate);
  if(gate){const h=location.hash.slice(1);$('#app').innerHTML=h==='entrar'?(S.authReady?vLogin():'<p class="empty">Cargando…</p>'):h==='probar'?vProbar():vPortada();scrollTo(0,0);return}
  if(!S.ready){$('#app').innerHTML='<p class="empty">Cargando tu agenda…</p>';return}
  $('#app').innerHTML=V[v]();{const g=document.querySelector('.xgrid'),c=g&&g.querySelector('.cur');if(c){if(g.scrollWidth>g.clientWidth)g.scrollLeft=c.offsetLeft-g.clientWidth/2;else g.scrollTop=c.offsetTop-g.clientHeight/2}}setTimeout(()=>{checkLogros();checkRetos();celebrar();pomoDraw()},0);const c=$('#chart');if(c){chartRO.disconnect();chartRO.observe(c);drawChart()}}
addEventListener('hashchange',()=>{scrollTo(0,0);render()});

/* ---------- acciones ---------- */
function markPile(n){const list=deckCards();const c=list[ui.idx];if(!c)return;const id=c.mz;const piles=Object.assign({},S.piles[id]||{});piles[c.id]=n;S.piles=Object.assign({},S.piles,{[id]:piles});ui.flip=false;srsMark(id,c.id,n);statAdd('c',1);
  if(ui.filtro==='todas'||ui.filtro==='tipica'||ui.filtro==='hoy'&&n===3||String(n)===ui.filtro)ui.idx++;
  kvSet('piles');logAct(1);render()}
function recordErr(q,right){const items=Object.assign({},S.err.items||{});const k=q.id||hash(q.q);const cur=items[k];
  if(right){if(!cur)return false;const racha=(cur.racha||0)+1;if(racha>=2)delete items[k];else items[k]=Object.assign({},cur,{racha})}
  else items[k]={q:q.q,opts:q.opts,c:q.c,exp:q.exp||'',tema:q.tema||'',tipico:!!q.tipico,fallos:((cur&&cur.fallos)||0)+1,racha:0};
  S.err={items};return true}
async function finishTest(){const T=ui.test;let a=0,f=0,b=0,ch=false;{let sg=(S.rec||{}).acSeg||0,mx=(S.rec||{}).acMax||0;T.t.preguntas.forEach((q,i)=>{if(T.ans[i]===q.c){sg++;mx=Math.max(mx,sg)}else sg=0});S.rec=Object.assign({},S.rec,{acSeg:sg,acMax:mx});kvSet('records')}T.t.preguntas.forEach((q,i)=>{const x=T.ans[i];if(x===undefined||x===null)b++;else if(x===q.c){a++;if(recordErr(q,true))ch=true}else{f++;recordErr(q,false);ch=true}});
  if(ch)kvSet('errores');
  T.r={testId:T.t.id,titulo:T.t.titulo,tema:T.t.tema||'',aciertos:a,fallos:f,blanco:b,total:T.t.preguntas.length,fecha:new Date().toISOString()};T.done=true;render();
  S.res=S.res.concat([T.r]);kvSet('resultados');statAdd('q',T.t.preguntas.length);logAct(T.t.preguntas.length);T.saved=true;render()}
let vfTimer=null;
function vfTick(){const G=ui.game;if(!G||G.kind!=='vf'||G.over){clearInterval(vfTimer);return}const left=Math.ceil((G.end-Date.now())/1000);if(left<=0){G.over=true;clearInterval(vfTimer);if(G.ok)logAct(G.ok);const rec=S.rec||{};if(G.ok>(rec.vf||0)){G.rec=true;S.rec=Object.assign({},rec,{vf:G.ok});kvSet('records')}render()}else{const el=$('#gt');if(el)el.textContent=left+' s';const tb=document.querySelector('.tbar i');if(tb)tb.style.width=Math.max(0,(G.end-Date.now())/600)+'%'}}
function startVF(scope){const pool=bank(scope||'');if(!pool.length)return;ui.game={kind:'vf',scope,pool,ok:0,ko:0,miss:[],end:Date.now()+60000};vfNext();clearInterval(vfTimer);vfTimer=setInterval(vfTick,250);render()}
function startEmp(mazo){ui.game={kind:'emp',mazo};empNew();render()}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act],[data-pile],[data-opt],#flip,[data-ml],[data-mr]');if(!el)return;
  if(el.id==='flip'){ui.flip=!ui.flip;el.classList.toggle('on',ui.flip);el.querySelector('.face.f').setAttribute('aria-hidden',ui.flip);el.querySelector('.face.b').setAttribute('aria-hidden',!ui.flip);el.setAttribute('aria-label',ui.flip?'Respuesta. Pulsa para volver a la pregunta':'Pregunta. Pulsa para ver la respuesta');return}
  if(el.dataset.pile){markPile(+el.dataset.pile);return}
  if(el.dataset.opt!==undefined){const T=ui.test;if(T.shown[T.i])return;T.ans[T.i]=+el.dataset.opt;render();return}
  if(el.dataset.ml!==undefined){const G=ui.game;G.sel=el.dataset.ml;G.bad=null;render();return}
  if(el.dataset.mr!==undefined){const G=ui.game;if(!G.sel)return;const r=el.dataset.mr;if(r===G.sel){G.done.add(r);G.sel=null;if(G.done.size===G.cards.length){G.over=true;logAct(G.cards.length);G.secs=(Date.now()-G.t0)/1000+G.errs*3;const rec=S.rec||{};if(!rec.emp||G.secs<rec.emp){G.rec=true;S.rec=Object.assign({},rec,{emp:G.secs});kvSet('records')}}}else{G.errs++;G.bad='r'+r}render();return}
  const a=el.dataset.act,T=ui.test,G=ui.game;
  if(a==='estado'){const t=S.temas.find(x=>x.id===el.dataset.id);if(!t)return;t.estado=EST[(EST.indexOf(t.estado||'pendiente')+1)%3];S.estados=Object.assign({},S.estados,{[t.id]:t.estado});kvSet('estados');render()}
  else if(a==='inscrita'){S.config=Object.assign({},S.config,{inscrita:true});kvSet('config');render()}
  else if(a==='next'){ui.idx++;ui.flip=false;render()}
  else if(a==='prev'){ui.idx=Math.max(0,ui.idx-1);ui.flip=false;render()}
  else if(a==='login'){login()}
  else if(a==='goCards'){ui.mazo=el.dataset.id;ui.idx=0;ui.filtro='todas';location.hash='tarjetas'}
  else if(a==='goTest'){ui.scope=el.dataset.id;const qs=shuffle(bank(ui.scope));const t=S.temas.find(x=>x.id===ui.scope);startRun('Práctica · Tema '+(t?t.codigo:''),ui.scope,qs.slice(0,10),'practica-'+ui.scope)}
  else if(a==='pedir'){const id=el.dataset.id;if(!fs||!uid){flash('Entra con Google (arriba a la derecha) para pedir tarjetas');return}
    el.disabled=true;fs.collection('pedidos').doc(id).set({t:Date.now()}).then(()=>{S.pedidos=Object.assign({},S.pedidos,{[id]:Date.now()});render();flash('¡Pedido! Las tarjetas estarán en 1 hora aprox.')}).catch(()=>{el.disabled=false;flash('No se pudo hacer el pedido')})}
  else if(a==='logout'){auth&&auth.signOut().then(()=>location.reload())}
  else if(a==='xcfg'){const k=el.dataset.k;const e=S.exams[el.dataset.id];ui.xcfg={kind:k,id:el.dataset.id,titulo:k==='oficial'?e.titulo:k==='gen'?'Examen completo (simulacro)':'Simulacro a tu medida'};render();scrollTo(0,0)}
  else if(a==='pomo'){pomoStart();render()}
  else if(a==='pomostop'){pomoStop();render()}
  else if(a==='dgo'){const g=el.dataset.go,t=el.dataset.t;if(g==='cards'){ui.mazo=t;ui.idx=0;ui.filtro='nueva';location.hash='tarjetas'}else if(g==='repaso'){ui.filtro='hoy';ui.idx=0;location.hash='tarjetas'}else if(g==='errores'){const b=document.createElement('button');b.dataset.act='merr';location.hash='tests';setTimeout(()=>{const x=document.querySelector('[data-act="merr"]');if(x)x.click()},50)}else if(g==='test'){ui.scope=t;const qs=shuffle(bank(t));if(qs.length)startRun('Test de la semana · Tema '+temaName(t),t,qs.slice(0,15),'practica-'+t);else location.hash='tests'}else if(g==='sim'){ui.xtab='sim';location.hash='tests'}else if(g==='temas')location.hash='temario'}
  else if(a==='xcancel'){ui.xcfg=null;render()}
  else if(a==='xofi'){const t=el.dataset.t,b=el.dataset.b;startExam({kind:'sim',titulo:'Preguntas oficiales · '+(t?'Tema '+temaName(t):'Bloque '+b),tema:t||'',bloque:t?'':b,n:200,fuente:'ofi',modo:'momento',tiempo:'libre',pistas:'no'})}
  else if(a==='xnext'){ui.ex.i++;ui.ex.conf=false;render();scrollTo(0,0)}
  else if(a==='xprev'){ui.ex.i--;ui.ex.conf=false;render();scrollTo(0,0)}
  else if(a==='xdud'){const X=ui.ex;if(X.dud[X.i])delete X.dud[X.i];else X.dud[X.i]=1;render()}
  else if(a==='xpis'){const X=ui.ex;X.pis[X.i]=pista(X.items[X.i].q);if(X.ans[X.i]===X.pis[X.i])delete X.ans[X.i];render()}
  else if(a==='xclr'){delete ui.ex.ans[ui.ex.i];render()}
  else if(a==='xfin'){const X=ui.ex;if(!X.conf&&Object.keys(X.ans).length<X.items.length){X.conf=true;render();return}finishExam()}
  else if(a==='xquit'){clearInterval(exTimer);ui.ex=null;render();scrollTo(0,0)}
  else if(a==='mascCfg'){ui.mcfg=!ui.mcfg;render()}
  else if(a==='fsz'){const on=!document.documentElement.classList.contains('big');document.documentElement.classList.toggle('big',on);try{localStorage.setItem('agendaTAI:big',on?'1':'')}catch(e){};el.setAttribute('aria-pressed',on)}
  else if(a==='hedit'){ui.hedit=!ui.hedit;render()}
  else if(a==='hplant'){plantilla();render()}
  else if(a==='hdel'){const i=ui.hdia==null?hoyIdx():ui.hdia;const bl=bloquesDia(i).slice();bl.splice(+el.dataset.i,1);setDia(i,bl);render()}
  else if(a==='hcopy'){const src=bloquesDia(+el.dataset.i);for(let k=0;k<5;k++)if(k!==+el.dataset.i)setDia(k,src.map(b=>Object.assign({},b)));flash('Copiado a lunes–viernes');render()}
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
document.addEventListener('submit',e=>{const f=e.target.closest('[data-mcfg]');if(!f)return;e.preventDefault();const n=(f.n.value||'').trim().slice(0,16)||'Pipo';const m=+((f.querySelector('input[name=m]:checked')||{}).value||20);S.config=Object.assign({},S.config,{masc:n,meta:m,descanso:[...f.querySelectorAll('input[name=dd]:checked')].map(x=>+x.value)});kvSet('config');ui.mcfg=false;render()});
document.addEventListener('submit',e=>{const f=e.target.closest('[data-hform]');if(!f)return;e.preventDefault();const i=+f.dataset.hform;const b={h:f.h.value,f:f.f.value,t:f.t.value.trim().slice(0,40),tipo:HT[f.tipo.value]?f.tipo.value:'libre'};if(!b.h||!b.t)return;setDia(i,bloquesDia(i).concat([b]));render()});
document.addEventListener('click',e=>{const d=e.target.closest('#dflip,[data-dcard],[data-dopt],[data-dnext],[data-dreset]');if(!d||!ui.demo)return;const D=ui.demo;
  if(d.id==='dflip'){D.flip=!D.flip;d.classList.toggle('on',D.flip);d.querySelector('.face.f').setAttribute('aria-hidden',D.flip);d.querySelector('.face.b').setAttribute('aria-hidden',!D.flip);return}
  if(d.dataset.dcard){D.i=(D.i+ +d.dataset.dcard+5)%5;D.flip=false}else if(d.dataset.dopt!=null){D.ans[D.q]=+d.dataset.dopt}else if(d.dataset.dnext){D.q++}else if(d.dataset.dreset){D.q=0;D.ans=[]}
  const y=scrollY;render();scrollTo(0,y)});
document.addEventListener('click',e=>{const o=e.target.closest('[data-xopt],[data-xgo],[data-xf]');if(!o||!ui.ex)return;const X=ui.ex;if(o.dataset.xopt!=null){if(X.modo==='momento'&&X.ans[X.i]!=null)return;X.ans[X.i]=+o.dataset.xopt;X.conf=false}else if(o.dataset.xgo!=null){X.i=+o.dataset.xgo;X.conf=false;scrollTo(0,0)}else X.filt=o.dataset.xf;render()});
document.addEventListener('submit',e=>{const f=e.target.closest('[data-xcfg]');if(!f)return;e.preventDefault();const v=n=>{const el=f.querySelector(`[name="${n}"]:checked`)||f.querySelector(`[name="${n}"]`);return el?el.value:''};const c=Object.assign({},ui.xcfg,{sup:v('sup'),modo:v('modo'),tiempo:v('tiempo'),pistas:v('pistas'),bloque:v('bloque'),tema:v('tema'),n:+v('n')||20,fuente:v('fuente')});if(c.kind==='sim'&&c.tema)c.titulo='Simulacro · Tema '+temaName(c.tema);else if(c.kind==='sim'&&c.bloque)c.titulo='Simulacro · Bloque '+c.bloque;startExam(c)});
document.addEventListener('click',e=>{const p=e.target.closest('[data-ptab]');if(p){ui.ptab=p.dataset.ptab;render()}});
document.addEventListener('click',e=>{const t=e.target.closest('[data-xtab]');if(t){ui.xtab=t.dataset.xtab;ui.xcfg=null;render()}});
document.addEventListener('click',e=>{const f=e.target.closest('[data-filtro]');if(f){ui.filtro=f.dataset.filtro;ui.idx=0;ui.flip=false;render()}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-hdia]');if(b){ui.hdia=+b.dataset.hdia;render()}});
{let sx=null,sy=null;document.addEventListener('touchstart',e=>{if(e.target.closest('#flip')){sx=e.touches[0].clientX;sy=e.touches[0].clientY}},{passive:true});document.addEventListener('touchend',e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;sx=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){const b=document.querySelector(`[data-act="${dx<0?'next':'prev'}"]`);if(b){e.preventDefault();b.click()}}})}
document.addEventListener('keydown',e=>{if(location.hash==='#tarjetas'&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){const k={ArrowRight:'[data-act="next"]',ArrowLeft:'[data-act="prev"]','1':'[data-pile="1"]','2':'[data-pile="2"]','3':'[data-pile="3"]'}[e.key];if(k){const b=document.querySelector(k);if(b){e.preventDefault();b.click();return}}}});
document.addEventListener('keydown',e=>{const f=e.target.closest&&e.target.closest('#flip,#dflip');if(f&&(e.key==='Enter'||e.key===' ')){e.preventDefault();f.click()}});
document.addEventListener('change',e=>{const dk=e.target.dataset&&e.target.dataset.dk;if(dk){const d=Object.assign({},S.diario||{});const t=Object.assign({},d[today()]||{});if(e.target.checked){t[dk]=1;logAct(2);const m=dk.match(/^l-(.+)-(\d+)$/);if(m){const tt=S.temas.find(x=>x.id===m[1]);const prevp=(S.lectura||{})[m[1]]||((tt&&tt.pagIni)||1)-1;statAdd('p',Math.max(0,+m[2]-prevp));S.lectura=Object.assign({},S.lectura,{[m[1]]:+m[2]});kvSet('lectura')}}else delete t[dk];d[today()]=t;const ks=Object.keys(d).sort();while(ks.length>40)delete d[ks.shift()];S.diario=d;kvSet('diario');render();return}});
document.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.task){const k=e.target.dataset.task;const h=Object.assign({},(S.planHecho||{}).h||{});if(e.target.checked){h[k]=true;logAct(1)}else delete h[k];S.planHecho={h};kvSet('planHecho');render();return}const id=e.target.id;if(id==='mazo'){ui.mazo=e.target.value;ui.idx=0;ui.flip=false;render()}else if(id==='filtro'){ui.filtro=e.target.value;ui.idx=0;ui.flip=false;render()}else if(id==='scope'){ui.scope=e.target.value;render()}});

/* ---------- datos ---------- */
const getJ=u=>fetch(u,{cache:'no-cache'}).then(r=>r.ok?r.json():null).catch(()=>null);
function acct(){const el=$('#acct');if(!el)return;if(!S.user&&window.FIREBASE_CONFIG){el.innerHTML=`<a class="mini ghost" href="#probar">Probar</a> <a class="btn" href="#entrar" style="min-height:38px;padding:6px 14px">Entrar</a>`;return}el.innerHTML=S.user?`${S.user.photoURL?`<img class="av" src="${esc(S.user.photoURL)}" alt="" referrerpolicy="no-referrer">`:''}<button class="mini ghost" data-act="logout">Salir</button>`:''}
async function login(){if(!auth)return;const p=new firebase.auth.GoogleAuthProvider();try{await auth.signInWithPopup(p)}catch(e){try{await auth.signInWithRedirect(p)}catch(e2){flash('No se pudo iniciar sesión')}}}
async function loadRemote(){const snap=await fs.collection('users').doc(uid).collection('kv').get();if(snap.empty){flash('¡Bienvenida! Empieza cuando quieras');return}snap.forEach(d=>{try{const v=JSON.parse(d.data().v);applyKV(d.id,v);lsSet(d.id,v)}catch(e){}});flash('Sincronizado')}
function loadScript(src){return new Promise((ok,ko)=>{const x=document.createElement('script');x.src=src;x.onload=ok;x.onerror=ko;document.head.appendChild(x)})}
(async()=>{
  {const V=14;if(+document.documentElement.dataset.v!==V){try{if(!sessionStorage.getItem('agendaTAI:rl')){sessionStorage.setItem('agendaTAI:rl','1');await fetch('./',{cache:'reload'});await fetch('./?v='+V,{cache:'reload'});location.reload();return}}catch(e){}}else{try{sessionStorage.removeItem('agendaTAI:rl')}catch(e){}}}
  render();
  const [idx,plan,tests]=await Promise.all([getJ('data/temas.json'),getJ('data/plan.json'),getJ('data/tests.json')]);
  S.temasBase=idx||[];S.plan=plan||{};S.tests=tests||[];
  await Promise.all(S.temasBase.map(async t=>{const [c,p]=await Promise.all([t.tarjetas?getJ(`data/temas/${t.id}.cards.json`):null,t.preguntas?getJ(`data/temas/${t.id}.preguntas.json`):null]);if(c&&c.cards)S.cards[t.id]=c.cards;if(p&&p.preguntas)S.preg[t.id]=p.preguntas}));
  if(!window.FIREBASE_CONFIG){KEYS.forEach(k=>{const v=lsGet(k);if(v!=null)applyKV(k,v)})}
  S.ready=true;render();loadExams();
  if(window.FIREBASE_CONFIG){try{
    const V='10.12.2';await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-app-compat.js`);await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-auth-compat.js`);await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore-compat.js`);
    firebase.initializeApp(window.FIREBASE_CONFIG);auth=firebase.auth();fs=firebase.firestore();
    fs.collection('pedidos').get().then(q=>{const p={};q.forEach(d=>{const x=d.data();if(x&&x.t)p[d.id]=x.t});S.pedidos=p;if(!busy())render()}).catch(()=>{});
    auth.onAuthStateChanged(async u=>{S.authReady=true;uid=u?u.uid:null;S.user=u?{displayName:u.displayName,photoURL:u.photoURL}:null;resetUser();
      if(uid){LS='agendaTAI:'+uid+':';try{const pr=fs.collection('users').doc(uid);pr.get().then(d=>pr.set(Object.assign({nombre:u.displayName||'',email:u.email||'',ultimoAcceso:new Date()},d.exists?{}:{alta:new Date()}),{merge:true})).catch(()=>{})}catch(e){}KEYS.forEach(k=>{const v=lsGet(k);if(v!=null)applyKV(k,v)});render();try{await loadRemote()}catch(e){flash('No se pudo leer de la nube')}}
      render()});
  }catch(e){S.authReady=true;$('#app').innerHTML='<p class="empty">No se pudo conectar. Revisa tu conexión y recarga la página.</p>'}}
})();
}
