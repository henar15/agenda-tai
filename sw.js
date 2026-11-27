/**
 * Service worker: permite instalar la web como app y usarla sin conexión.
 * Estrategia: red primero (siempre lo último) y, si no hay conexión, lo guardado en caché.
 * Al publicar una versión nueva, sube VERSION (y ?v= en index.html y V en assets/js/main.js).
 */
const VERSION = 29;
const CACHE = `agenda-tai-v${VERSION}`;
const SCRIPTS = [
  'firebase-config',
  'core',
  'motivacion',
  'plan',
  'tarjetas',
  'pomodoro',
  'progreso',
  'inicio',
  'temario',
  'tests',
  'examenes',
  'juegos',
  'nivel',
  'semanal',
  'render',
  'acciones',
  'main',
];
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  `assets/css/styles.css?v=${VERSION}`,
  'assets/icons/icon.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  ...SCRIPTS.map((s) => `assets/js/${s}.js?v=${VERSION}`),
];
const CDN = ['www.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const guardar = (req, res) => {
  const copia = res.clone();
  caches.open(CACHE).then((c) => c.put(req, copia));
  return res;
};

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Librerías de Firebase: caché primero (no cambian dentro de una versión)
  if (CDN.includes(url.hostname)) {
    e.respondWith(
      caches.match(e.request).then((r) => r || fetch(e.request).then((res) => guardar(e.request, res))),
    );
    return;
  }
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => (res.ok ? guardar(e.request, res) : res))
      .catch(() =>
        caches
          .match(e.request, { ignoreSearch: url.pathname.endsWith('/') })
          .then((r) => r || caches.match('index.html')),
      ),
  );
});
