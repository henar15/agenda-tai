// Service worker: la agenda funciona sin conexión (último contenido guardado)
const C='agenda-tai-v17';
const SHELL=['./','index.html','app.js?v=17','firebase-config.js?v=17','icon.svg','icon-192.png','icon-512.png','manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET')return;
  if(u.hostname==='www.gstatic.com'||u.hostname==='cdnjs.cloudflare.com'){e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp));return res})));return}
  if(u.origin!==location.origin)return;
  // red primero (para tener siempre lo último) y, si no hay conexión, lo guardado
  e.respondWith(fetch(e.request).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp))}return res}).catch(()=>caches.match(e.request,{ignoreSearch:u.pathname.endsWith('/')||u.pathname.endsWith('index.html')}).then(r=>r||caches.match('index.html'))))});
