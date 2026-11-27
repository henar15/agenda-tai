/**
 * Arranque: carga de datos, Firebase (Google + Firestore) y service worker.
 */
/* ---------- datos ---------- */
const getJ = (u) =>
  fetch(u, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
function acct() {
  const el = $('#acct');
  if (!el) return;
  if (!S.user && window.FIREBASE_CONFIG) {
    el.innerHTML = `<a class="mini ghost" href="#probar">Probar</a> <a class="btn" href="#entrar" style="min-height:38px;padding:6px 14px">Entrar</a>`;
    return;
  }
  el.innerHTML = S.user
    ? `${S.user.photoURL ? `<img class="av" src="${esc(S.user.photoURL)}" alt="" referrerpolicy="no-referrer">` : ''}<button class="mini ghost" data-act="logout">Salir</button>`
    : '';
}
async function login() {
  if (!auth) return;
  const p = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(p);
  } catch (e) {
    try {
      await auth.signInWithRedirect(p);
    } catch (e2) {
      flash('No se pudo iniciar sesión');
    }
  }
}
async function loadRemote() {
  const snap = await fs.collection('users').doc(uid).collection('kv').get();
  const subir = new Set(kvPend);
  kvPend.clear();
  if (snap.empty) {
    S.remoteOk = true;
    KEYS.forEach((k) => kvVal(k) != null && subir.add(k));
    subir.forEach((k) => kvSet(k));
    flash('¡Bienvenida! Empieza cuando quieras');
    return;
  }
  snap.forEach((d) => {
    try {
      const rem = JSON.parse(d.data().v);
      const loc = kvVal(d.id);
      const v = mergeKV(d.id, loc, rem);
      applyKV(d.id, v);
      lsSet(d.id, v);
      if (JSON.stringify(v) !== d.data().v) subir.add(d.id);
    } catch (e) {}
  });
  S.remoteOk = true;
  subir.forEach((k) => kvSet(k));
  try {
    memSeed();
  } catch (e) {}
  flash('Sincronizado');
}
// Al volver a la app (por ejemplo, del móvil al ordenador), se trae y mezcla lo último de la nube
let ultimaLectura = 0;
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !uid || !fs || Date.now() - ultimaLectura < 30000) return;
  ultimaLectura = Date.now();
  try {
    S.remoteOk = false;
    await loadRemote();
    if (!ui.rit && !ui.ex) render();
  } catch (e) {
    S.remoteOk = true;
  }
});
function loadScript(src) {
  return new Promise((ok, ko) => {
    const x = document.createElement('script');
    x.src = src;
    x.onload = ok;
    x.onerror = ko;
    document.head.appendChild(x);
  });
}
(async () => {
  {
    const V = 26;
    if (+document.documentElement.dataset.v !== V) {
      try {
        if (!sessionStorage.getItem('agendaTAI:rl')) {
          sessionStorage.setItem('agendaTAI:rl', '1');
          await fetch('./', { cache: 'reload' });
          await fetch('./?v=' + V, { cache: 'reload' });
          location.reload();
          return;
        }
      } catch (e) {}
    } else {
      try {
        sessionStorage.removeItem('agendaTAI:rl');
      } catch (e) {}
    }
  }
  render();
  const [idx, plan, tests] = await Promise.all([
    getJ('data/temas.json'),
    getJ('data/plan.json'),
    getJ('data/tests.json'),
  ]);
  S.temasBase = idx || [];
  S.plan = plan || {};
  S.tests = tests || [];
  await Promise.all(
    S.temasBase.map(async (t) => {
      const [c, p] = await Promise.all([
        t.tarjetas ? getJ(`data/temas/${t.id}.cards.json`) : null,
        t.preguntas ? getJ(`data/temas/${t.id}.preguntas.json`) : null,
      ]);
      if (c && c.cards) S.cards[t.id] = c.cards;
      if (p && p.preguntas) S.preg[t.id] = p.preguntas;
    }),
  );
  if (!window.FIREBASE_CONFIG) {
    KEYS.forEach((k) => {
      const v = lsGet(k);
      if (v != null) applyKV(k, v);
    });
  }
  S.ready = true;
  render();
  loadExams();
  loadEsq();
  if (window.FIREBASE_CONFIG) {
    try {
      const V = '10.12.2';
      await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-app-compat.js`);
      await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-auth-compat.js`);
      await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore-compat.js`);
      firebase.initializeApp(window.FIREBASE_CONFIG);
      auth = firebase.auth();
      fs = firebase.firestore();
      try {
        fs.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      } catch (e) {}
      fs.collection('pedidos')
        .get()
        .then((q) => {
          const p = {};
          q.forEach((d) => {
            const x = d.data();
            if (x && x.t) p[d.id] = x.t;
          });
          S.pedidos = p;
          if (!busy()) render();
        })
        .catch(() => {});
      auth.onAuthStateChanged(async (u) => {
        S.authReady = true;
        uid = u ? u.uid : null;
        S.user = u ? { displayName: u.displayName, photoURL: u.photoURL } : null;
        resetUser();
        if (uid) {
          LS = 'agendaTAI:' + uid + ':';
          try {
            const pr = fs.collection('users').doc(uid);
            pr.get()
              .then((d) =>
                pr.set(
                  Object.assign(
                    { nombre: u.displayName || '', email: u.email || '', ultimoAcceso: new Date() },
                    d.exists ? {} : { alta: new Date() },
                  ),
                  { merge: true },
                ),
              )
              .catch(() => {});
          } catch (e) {}
          KEYS.forEach((k) => {
            const v = lsGet(k);
            if (v != null) applyKV(k, v);
          });
          render();
          try {
            S.remoteOk = false;
            await loadRemote();
            ultimaLectura = Date.now();
          } catch (e) {
            S.remoteOk = true;
            kvPend.forEach((k) => kvSet(k));
            kvPend.clear();
            flash('No se pudo leer de la nube');
          }
        }
        render();
      });
    } catch (e) {
      S.authReady = true;
      $('#app').innerHTML =
        '<p class="empty">No se pudo conectar. Revisa tu conexión y recarga la página.</p>';
    }
  }
})();

if ('serviceWorker' in navigator)
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window._bip = e;
});
