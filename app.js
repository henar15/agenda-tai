{
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rich=v=>esc(v).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
const plain=v=>String(v??'').replace(/\*\*/g,'');
const BL={I:{c:'var(--b1)',hex:'#7c3aed',l:'#ede9fe',n:'Organización del Estado y Administración electrónica'},II:{c:'var(--b2)',hex:'#0d9488',l:'#ccfbf1',n:'Tecnología básica'},III:{c:'var(--b3)',hex:'#2563eb',l:'#dbeafe',n:'Desarrollo de sistemas'},IV:{c:'var(--b4)',hex:'#ea580c',l:'#ffedd5',n:'Sistemas y comunicaciones'}};
const EST=['pendiente','en-curso','estudiado'],ESTN={'pendiente':'Pendiente','en-curso':'En curso','estudiado':'Estudiado'};
const S={horario:{dias:[]},act:{},pedidos:{},user:null,authReady:false,plan:{},planHecho:{},temasBase:[],temas:[],cards:{},piles:{},estados:{},tests:[],preg:{},res:[],config:{},err:{},rec:{},ready:false};
const ui={hdia:null,hedit:false,mazo:'',filtro:'todas',idx:0,flip:false,test:null,scope:'',game:null};

const fmtD=d=>{if(!d)return'';const x=new Date(d+'T12:00:00');return x.toLocaleDateString('es-ES',{day:'numeric',month:'short'})};
const monday=()=>{const d=new Date();const w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return d.toISOString().slice(0,10)};
const nota=r=>{const t=r.total||1;return Math.max(0,(r.aciertos-(r.fallos||0)/3))/t*10};
const n1=v=>v.toFixed(1).replace('.',',');
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const hash=s=>{let h=0;for(const ch of String(s))h=(h*31+ch.codePointAt(0))|0;return 'q'+(h>>>0).toString(36)};
let LS='agendaTAI:anon:';
const lsGet=k=>{try{return JSON.parse(localStorage.getItem(LS+k))}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(LS+k,JSON.stringify(v))}catch(e){}};
const KEYS=['estados','piles','resultados','errores','config','records','planHecho','actividad','horario'];
let fs=null,uid=null,auth=null;
function kvVal(k){return {horario:S.horario,actividad:S.act,estados:S.estados,piles:S.piles,resultados:{items:S.res},errores:S.err,config:S.config,records:S.rec,planHecho:S.planHecho}[k]}
function applyKV(k,v){if(v==null)return;if(k==='estados')S.estados=v;else if(k==='piles')S.piles=v;else if(k==='resultados')S.res=v.items||[];else if(k==='errores')S.err=v;else if(k==='config')S.config=v;else if(k==='records')S.rec=v;else if(k==='planHecho')S.planHecho=v;else if(k==='actividad')S.act=v;else if(k==='horario')S.horario=v}
const kvT={};
function kvSet(k){const v=kvVal(k);lsSet(k,v);if(fs&&uid){clearTimeout(kvT[k]);kvT[k]=setTimeout(()=>{fs.collection('users').doc(uid).collection('kv').doc(k).set({v:JSON.stringify(v),t:Date.now()}).then(()=>flash('Guardado en la nube')).catch(()=>flash('No se pudo guardar en la nube'))},500)}else flash('Guardado en este dispositivo')}
function flash(t){const e=$('#sync');if(e)e.textContent=t}
function resetUser(){Object.assign(S,{horario:{dias:[]},act:{},estados:{},piles:{},res:[],err:{},config:{},rec:{},planHecho:{}})}
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
   L('vf15','⚡','Juegos','Velocista','15 aciertos en Verdadero o falso',(rec.vf||0)>=15),L('vf25','⚡','Juegos','Rayo','25 aciertos en Verdadero o falso',(rec.vf||0)>=25),L('emp','🧩','Juegos','Emparejadora','Completa Empareja en menos de 60 s',rec.emp&&rec.emp<60)]}
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
  if(!ks.length)return {n:0,esc:0,hoy:false,pts,meta:metaDia(),salvados:0};
  let n=0,esc=0,salv=0;const d=new Date(ks[0]+'T12:00:00');
  while(dkey(d)<t){if(dayOk(dkey(d))){n++;if(n%7===0)esc=Math.min(2,esc+1)}else if(n>0&&esc>0){esc--;salv++}else n=0;d.setDate(d.getDate()+1)}
  const hoy=dayOk(t);if(hoy){n++;if(n%7===0)esc=Math.min(2,esc+1)}
  return {n,esc,hoy,pts,meta:metaDia(),salvados:salv}}
function racha(){return R().n}
const etapa=n=>{let i=0;ETAPAS.forEach((e,k)=>{if(n>=e.d)i=k});return i};
const accDe=m=>{let r=null;ACCS.forEach(x=>{if(m>=x.a)r=x});return r};
function mascSVG(st,acc,mood,size,label){
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
  return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="${esc(label)}">${g}</svg>`}
function frase(r){const h=[...today()].reduce((a,c)=>a+c.charCodeAt(0),0);const pick=a=>a[h%a.length].replace('{meta}',r.meta).replace('{pts}',r.pts).replace('{left}',Math.max(0,r.meta-r.pts));
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
  <div class="mstats"><span title="Días seguidos cumpliendo la meta">🔥 <b>${r.n}</b> ${r.n===1?'día':'días'}</span><span title="Cada escudo salva un día que no estudies">🛡️ <b>${r.esc}</b>/2 escudos</span></div>
  ${sig?`<p class="fine">${sig.d-r.n===1?'Mañana':`En ${sig.d-r.n} días`} se convierte en <b>${esc(sig.n.toLowerCase())}</b>.</p>`:'<p class="fine">¡Ha llegado a su forma final!</p>'}
  ${ui.mcfg?`<form class="mcfg" data-mcfg="1"><label>Nombre<input name="n" maxlength="16" value="${esc(nm)}"></label><fieldset><legend>Meta diaria</legend>${[10,20,40].map(m=>`<label class="chip"><input type="radio" name="m" value="${m}"${m===r.meta?' checked':''}> ${m} puntos</label>`).join('')}</fieldset><p class="fine">1 punto por cada tarjeta que clasificas o pregunta de test que respondes. Ganas un escudo cada 7 días de racha (máximo 2).</p><button class="btn">Guardar</button></form>`:''}
  </div></div>`}
function vEvolucion(){const r=R(),st=etapa(r.n),mx=Math.max(st,(S.rec||{}).stMax||0),am=(S.rec||{}).acMax||0;
  return `<div class="card"><h3>Evolución de ${esc(mascName())}</h3><p class="sub" style="margin-bottom:10px">Crece con tu racha de días. Los accesorios se ganan con aciertos seguidos en los tests (récord: ${am}).</p>
  <div class="evo">${ETAPAS.map((e,k)=>`<div class="${k<=mx?'on':''}">${k<=mx?mascSVG(k,null,'happy',72,e.n):mascSVG(k,null,'wait',72,e.n+' (bloqueado)')}<b>${esc(e.n)}</b><small>${e.d?e.d+(e.d===1?' día':' días'):'Inicio'}</small></div>`).join('')}</div>
  <div class="evo acc">${ACCS.map(a=>`<div class="${am>=a.a?'on':''}">${mascSVG(4,a,'happy',72,a.n+(am>=a.a?'':' (bloqueado)'))}<b>${esc(a.n)}</b><small>${a.a} aciertos seguidos</small></div>`).join('')}</div></div>`}
function celebrar(){if(!S.user||!S.ready||document.querySelector('.modal'))return;const r=R(),st=etapa(r.n),rec=S.rec||{};const am=rec.acMax||0,ac=accDe(am);
  let msg=null;
  if(rec.stMax==null){S.rec=Object.assign({},rec,{stMax:st,acSeen:ac?ac.id:null});kvSet('records');return}
  if(st>rec.stMax){msg={t:st===7?'¡Renace como fénix!':st===3?'¡Ha eclosionado!':'¡'+mascName()+' ha crecido!',d:`Ahora es ${ETAPAS[st].n.toLowerCase()}. Llevas ${r.n} días seguidos.`,svg:mascSVG(st,ac,'happy',160,ETAPAS[st].n)};S.rec=Object.assign({},rec,{stMax:st})}
  else if(ac&&ac.id!==rec.acSeen&&(!rec.acSeen||ACCS.findIndex(x=>x.id===ac.id)>ACCS.findIndex(x=>x.id===rec.acSeen))){msg={t:'¡Nuevo accesorio!',d:`${ac.n}: por ${ac.a} aciertos seguidos en los tests.`,svg:mascSVG(st,ac,'happy',160,ac.n)};S.rec=Object.assign({},rec,{acSeen:ac.id})}
  if(!msg)return;kvSet('records');const prev=document.activeElement;
  const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="mbox" role="dialog" aria-modal="true" aria-labelledby="mt">${msg.svg}<h2 id="mt">${esc(msg.t)}</h2><p>${esc(msg.d)}</p><button class="btn big2" data-close="1">¡Genial!</button></div>`;
  const close=()=>{m.remove();prev&&prev.focus&&prev.focus()};m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-close]'))close()});m.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='Tab'){e.preventDefault();if(e.key==='Escape')close()}});
  document.body.appendChild(m);m.querySelector('button').focus()}

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
  return `${warn}<h2 class="hola">Hola${nombre?', '+esc(nombre):''} 👋</h2>${vMascota()}
  <div class="card"><h3>Ahora</h3>${hoyHtml}</div>
  <div class="go"><a class="gob" href="#tarjetas"><span>🃏</span><b>Repasar tarjetas</b></a><a class="gob" href="#tests"><span>📝</span><b>Hacer un test</b></a>${ne?`<a class="gob" href="#tests"><span>🔁</span><b>Mis errores (${ne})</b></a>`:''}</div>
  <div class="kpis"><div class="kpi"><b>🏅 ${logros().filter(x=>x.ok).length}</b><span>logros</span></div><div class="kpi"><b>${nCards?Math.round(sabe/nCards*100)+'%':'–'}</b><span>tarjetas sabidas</span></div><div class="kpi"><b>${media===null?'–':n1(media)}</b><span>nota media</span></div></div>
  <div class="card"><h3>Temas de esta semana</h3>${sem.length?`<div class="list">${sem.map(rowTema).join('')}</div>`:'<p class="empty">Esta semana no hay temas nuevos: toca repasar.</p>'}</div>`;
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
  return `<h2>Temario: 34 temas</h2><p class="sub">Tarjetas y test de cada tema. Si un tema no tiene, pulsa «Generar tarjetas» y en un rato aparecen solas.</p>${ped.length?`<div class="warn"><span style="flex:1">Generando tarjetas de: <b>${ped.map(k=>esc(k.replace('-','.'))).join(', ')}</b>. Tardan alrededor de 1 hora; vuelve a abrir la web para verlas.</span></div>`:''}`+['I','II','III','IV'].map(b=>{const ts=S.temas.filter(t=>t.bloque===b).sort(ordT);return `<section class="blk"><h3><span class="tag" style="background:${BL[b].c}">Bloque ${b}</span>${esc(BL[b].n)}</h3><div class="list">${ts.map(rowTema).join('')}</div></section>`}).join('');
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
  return `<h2>Planning</h2>${vHorario()}
  <div class="phases">${fases.map(f=>`<div style="background:${f.color}">${esc(f.nombre)}<small>${esc(f.cuando)}</small></div>`).join('')}</div>
  ${cur?`<h3>Esta semana</h3>${wk(cur)}`:''}
  <h3 style="margin-top:24px">Cómo estudiar cada día</h3><div class="routine">${(P.rutina||[]).map(r=>`<div><b>${esc(r.t)}</b>${esc(r.d)}</div>`).join('')}</div>
  <h3 style="margin-top:28px">Todas las semanas</h3><p class="sub">Toca un mes para verlo.</p>
  ${Object.entries(byMonth).map(([m,ws])=>`<details class="mes"><summary>${esc(m)} <small>${ws.length} semanas</small></summary>${ws.map(wk).join('')}</details>`).join('')}`;
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
  <h3 class="pt-h">El examen, en resumen</h3><div class="card pt-exam"><ul><li><b>Primera parte:</b> 80 preguntas tipo test.</li><li><b>Segunda parte:</b> un supuesto práctico de 20 preguntas.</li><li><b>Tiempo:</b> 120 minutos en total.</li><li><b>Penalización:</b> cada respuesta mal resta un tercio de una bien.</li></ul><p class="fine">Datos orientativos: consulta siempre la convocatoria oficial en el BOE.</p></div>
  <h3 class="pt-h">Preguntas frecuentes</h3><div class="pt-faq"><details><summary>¿Cuesta dinero?</summary><p>No, es gratis.</p></details><details><summary>¿Quién ve mis datos?</summary><p>Solo tú. Tu progreso y tu horario se guardan en tu cuenta y nadie más puede verlos.</p></details><details><summary>¿Sustituye a la academia?</summary><p>No: es una ayuda para repasar y organizarte. El temario completo lo tienes en tus apuntes.</p></details><details><summary>¿Es una web oficial?</summary><p>No. No tiene relación con el INAP ni con ninguna administración.</p></details></div>
  <div class="pt-final card"><b>¿Empezamos?</b><a class="btn big2" href="#entrar">Entrar con Google</a></div>`}
function vProbar(){const cs=(S.cards['I-1']||[]).filter(c=>c.t).slice(0,5),qs=(S.preg['I-1']||[]).filter(q=>q.tipico).slice(0,5);
  if(!cs.length)return '<p class="empty">Cargando…</p>';
  const D=ui.demo=ui.demo||{i:0,flip:false,q:0,ans:[]};const c=cs[D.i%cs.length],b=BL.I;
  let test;if(D.q<qs.length){const q=qs[D.q],a=D.ans[D.q];test=`<p class="fine">Pregunta ${D.q+1} de ${qs.length}</p><p class="dq">${rich(q.q)}</p>${q.opts.map((o,k)=>`<button class="opt${a!=null?(k===q.c?' ok':k===a?' ko':''):''}" data-dopt="${k}"${a!=null?' disabled':''}>${rich(o)}</button>`).join('')}${a!=null?`<p class="sub">${rich(q.exp||'')}</p><button class="btn" data-dnext="1">${D.q+1<qs.length?'Siguiente':'Ver resultado'}</button>`:''}`}
  else{const ok=D.ans.filter((a,k)=>a===qs[k].c).length;test=`<div class="dres"><b>${ok} de ${qs.length}</b><p>${ok>=4?'¡Muy bien!':'Con las tarjetas lo vas a fijar.'} Entra para guardar tu progreso y hacer tests completos.</p><a class="btn" href="#entrar">Empezar gratis</a> <button class="btn ghost" data-dreset="1">Repetir</button></div>`}
  return `<h2>Pruébalo sin cuenta</h2><p class="sub">5 tarjetas y 5 preguntas del tema 1 (Constitución). Aquí no se guarda nada.</p>
  <div class="grid"><div class="card"><h3>Tarjetas</h3><div class="flip${D.flip?' on':''}" id="dflip" role="button" tabindex="0" aria-label="Girar tarjeta" style="--cc:${b.hex};--cl:${b.l}"><div class="fc"><div class="face f"><span class="tp">Típica de examen</span><div class="em">${esc(c.e||'')}</div><div class="q">${rich(c.q)}</div><span class="hint">Toca para ver la respuesta</span></div><div class="face b"><div class="a">${rich(c.a)}</div>${c.h?`<div class="h">${rich(c.h)}</div>`:''}</div></div></div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px"><button class="btn ghost" data-dcard="-1">Anterior</button><span class="fine">${D.i%cs.length+1} de ${cs.length}</span><button class="btn ghost" data-dcard="1">Siguiente</button></div></div>
  <div class="card"><h3>Mini test</h3>${test}</div></div>
  <div class="pt-final card"><b>¿Te gusta? Hay muchas más tarjetas y tests.</b><a class="btn big2" href="#entrar">Empezar gratis</a></div>`}
function vLogin(){return `<div class="login"><div class="lg-ico">📚</div><h2>Tu agenda para la oposición TAI</h2><p class="sub">Tarjetas para memorizar, tests con trampa, tu horario y tu progreso. Todo en un sitio, en el móvil y en el ordenador.</p>
  <button class="btn big" data-act="login"><svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Entrar con Google</button>
  <p class="fine">Cada persona tiene su propio progreso y su horario. Solo tú puedes verlos.</p><p><a href="#inicio" class="more">← Volver a la portada</a></p></div>`}
function busy(){return (ui.test&&!ui.test.done)||(ui.game&&!ui.game.over)}
function render(){S.temas=S.temasBase.map(t=>Object.assign({},t,{estado:(S.estados||{})[t.id]||'pendiente'}));const v=view();acct();document.querySelectorAll('#nav a').forEach(a=>{const on=a.dataset.v===v;a.classList.toggle('on',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  const gate=!!window.FIREBASE_CONFIG&&!S.user;document.body.classList.toggle('out',gate);
  if(gate){const h=location.hash.slice(1);$('#app').innerHTML=h==='entrar'?(S.authReady?vLogin():'<p class="empty">Cargando…</p>'):h==='probar'?vProbar():vPortada();scrollTo(0,0);return}
  if(!S.ready){$('#app').innerHTML='<p class="empty">Cargando tu agenda…</p>';return}
  $('#app').innerHTML=V[v]();setTimeout(()=>{checkLogros();celebrar()},0);const c=$('#chart');if(c){chartRO.disconnect();chartRO.observe(c);drawChart()}}
addEventListener('hashchange',()=>{scrollTo(0,0);render()});

/* ---------- acciones ---------- */
function markPile(n){const list=deckCards();const c=list[ui.idx];if(!c)return;const id=c.mz;const piles=Object.assign({},S.piles[id]||{});piles[c.id]=n;S.piles=Object.assign({},S.piles,{[id]:piles});ui.flip=false;
  if(ui.filtro==='todas'||ui.filtro==='tipica'||String(n)===ui.filtro)ui.idx++;
  kvSet('piles');logAct(1);render()}
function recordErr(q,right){const items=Object.assign({},S.err.items||{});const k=q.id||hash(q.q);const cur=items[k];
  if(right){if(!cur)return false;const racha=(cur.racha||0)+1;if(racha>=2)delete items[k];else items[k]=Object.assign({},cur,{racha})}
  else items[k]={q:q.q,opts:q.opts,c:q.c,exp:q.exp||'',tema:q.tema||'',tipico:!!q.tipico,fallos:((cur&&cur.fallos)||0)+1,racha:0};
  S.err={items};return true}
async function finishTest(){const T=ui.test;let a=0,f=0,b=0,ch=false;{let sg=(S.rec||{}).acSeg||0,mx=(S.rec||{}).acMax||0;T.t.preguntas.forEach((q,i)=>{if(T.ans[i]===q.c){sg++;mx=Math.max(mx,sg)}else sg=0});S.rec=Object.assign({},S.rec,{acSeg:sg,acMax:mx});kvSet('records')}T.t.preguntas.forEach((q,i)=>{const x=T.ans[i];if(x===undefined||x===null)b++;else if(x===q.c){a++;if(recordErr(q,true))ch=true}else{f++;recordErr(q,false);ch=true}});
  if(ch)kvSet('errores');
  T.r={testId:T.t.id,titulo:T.t.titulo,tema:T.t.tema||'',aciertos:a,fallos:f,blanco:b,total:T.t.preguntas.length,fecha:new Date().toISOString()};T.done=true;render();
  S.res=S.res.concat([T.r]);kvSet('resultados');logAct(T.t.preguntas.length);T.saved=true;render()}
let vfTimer=null;
function vfTick(){const G=ui.game;if(!G||G.kind!=='vf'||G.over){clearInterval(vfTimer);return}const left=Math.ceil((G.end-Date.now())/1000);if(left<=0){G.over=true;clearInterval(vfTimer);if(G.ok)logAct(G.ok);const rec=S.rec||{};if(G.ok>(rec.vf||0)){G.rec=true;S.rec=Object.assign({},rec,{vf:G.ok});kvSet('records')}render()}else{const el=$('#gt');if(el)el.textContent=left+' s'}}
function startVF(scope){const pool=bank(scope||'');if(!pool.length)return;ui.game={kind:'vf',scope,pool,ok:0,ko:0,miss:[],end:Date.now()+60000};vfNext();clearInterval(vfTimer);vfTimer=setInterval(vfTick,250);render()}
function startEmp(mazo){ui.game={kind:'emp',mazo};empNew();render()}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act],[data-pile],[data-opt],#flip,[data-ml],[data-mr]');if(!el)return;
  if(el.id==='flip'){ui.flip=!ui.flip;el.classList.toggle('on',ui.flip);return}
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
document.addEventListener('submit',e=>{const f=e.target.closest('[data-mcfg]');if(!f)return;e.preventDefault();const n=(f.n.value||'').trim().slice(0,16)||'Pipo';const m=+((f.querySelector('input[name=m]:checked')||{}).value||20);S.config=Object.assign({},S.config,{masc:n,meta:m});kvSet('config');ui.mcfg=false;render()});
document.addEventListener('submit',e=>{const f=e.target.closest('[data-hform]');if(!f)return;e.preventDefault();const i=+f.dataset.hform;const b={h:f.h.value,f:f.f.value,t:f.t.value.trim().slice(0,40),tipo:HT[f.tipo.value]?f.tipo.value:'libre'};if(!b.h||!b.t)return;setDia(i,bloquesDia(i).concat([b]));render()});
document.addEventListener('click',e=>{const d=e.target.closest('#dflip,[data-dcard],[data-dopt],[data-dnext],[data-dreset]');if(!d||!ui.demo)return;const D=ui.demo;
  if(d.id==='dflip'){D.flip=!D.flip;d.classList.toggle('on',D.flip);return}
  if(d.dataset.dcard){D.i=(D.i+ +d.dataset.dcard+5)%5;D.flip=false}else if(d.dataset.dopt!=null){D.ans[D.q]=+d.dataset.dopt}else if(d.dataset.dnext){D.q++}else if(d.dataset.dreset){D.q=0;D.ans=[]}
  const y=scrollY;render();scrollTo(0,y)});
document.addEventListener('click',e=>{const b=e.target.closest('[data-hdia]');if(b){ui.hdia=+b.dataset.hdia;render()}});
document.addEventListener('keydown',e=>{const f=e.target.closest&&e.target.closest('#flip,#dflip');if(f&&(e.key==='Enter'||e.key===' ')){e.preventDefault();f.click()}});
document.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.task){const k=e.target.dataset.task;const h=Object.assign({},(S.planHecho||{}).h||{});if(e.target.checked){h[k]=true;logAct(1)}else delete h[k];S.planHecho={h};kvSet('planHecho');render();return}const id=e.target.id;if(id==='mazo'){ui.mazo=e.target.value;ui.idx=0;ui.flip=false;render()}else if(id==='filtro'){ui.filtro=e.target.value;ui.idx=0;ui.flip=false;render()}else if(id==='scope'){ui.scope=e.target.value;render()}});

/* ---------- datos ---------- */
const getJ=u=>fetch(u,{cache:'no-cache'}).then(r=>r.ok?r.json():null).catch(()=>null);
function acct(){const el=$('#acct');if(!el)return;if(!S.user&&window.FIREBASE_CONFIG){el.innerHTML=`<a class="mini ghost" href="#probar">Probar</a> <a class="btn" href="#entrar" style="min-height:38px;padding:6px 14px">Entrar</a>`;return}el.innerHTML=S.user?`${S.user.photoURL?`<img class="av" src="${esc(S.user.photoURL)}" alt="" referrerpolicy="no-referrer">`:''}<button class="mini ghost" data-act="logout">Salir</button>`:''}
async function login(){if(!auth)return;const p=new firebase.auth.GoogleAuthProvider();try{await auth.signInWithPopup(p)}catch(e){try{await auth.signInWithRedirect(p)}catch(e2){flash('No se pudo iniciar sesión')}}}
async function loadRemote(){const snap=await fs.collection('users').doc(uid).collection('kv').get();if(snap.empty){flash('¡Bienvenida! Empieza cuando quieras');return}snap.forEach(d=>{try{const v=JSON.parse(d.data().v);applyKV(d.id,v);lsSet(d.id,v)}catch(e){}});flash('Sincronizado')}
function loadScript(src){return new Promise((ok,ko)=>{const x=document.createElement('script');x.src=src;x.onload=ok;x.onerror=ko;document.head.appendChild(x)})}
(async()=>{
  render();
  const [idx,plan,tests]=await Promise.all([getJ('data/temas.json'),getJ('data/plan.json'),getJ('data/tests.json')]);
  S.temasBase=idx||[];S.plan=plan||{};S.tests=tests||[];
  await Promise.all(S.temasBase.map(async t=>{const [c,p]=await Promise.all([t.tarjetas?getJ(`data/temas/${t.id}.cards.json`):null,t.preguntas?getJ(`data/temas/${t.id}.preguntas.json`):null]);if(c&&c.cards)S.cards[t.id]=c.cards;if(p&&p.preguntas)S.preg[t.id]=p.preguntas}));
  if(!window.FIREBASE_CONFIG){KEYS.forEach(k=>{const v=lsGet(k);if(v!=null)applyKV(k,v)})}
  S.ready=true;render();
  if(window.FIREBASE_CONFIG){try{
    const V='10.12.2';await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-app-compat.js`);await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-auth-compat.js`);await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore-compat.js`);
    firebase.initializeApp(window.FIREBASE_CONFIG);auth=firebase.auth();fs=firebase.firestore();
    fs.collection('pedidos').get().then(q=>{const p={};q.forEach(d=>{const x=d.data();if(x&&x.t)p[d.id]=x.t});S.pedidos=p;if(!busy())render()}).catch(()=>{});
    auth.onAuthStateChanged(async u=>{S.authReady=true;uid=u?u.uid:null;S.user=u?{displayName:u.displayName,photoURL:u.photoURL}:null;resetUser();
      if(uid){LS='agendaTAI:'+uid+':';KEYS.forEach(k=>{const v=lsGet(k);if(v!=null)applyKV(k,v)});render();try{await loadRemote()}catch(e){flash('No se pudo leer de la nube')}}
      render()});
  }catch(e){S.authReady=true;$('#app').innerHTML='<p class="empty">No se pudo conectar. Revisa tu conexión y recarga la página.</p>'}}
})();
}
