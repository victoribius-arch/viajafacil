// Service Worker de ViajaFácil — permite abrir la app sin conexión.
// La IA (traducir, carteles, lugares, conversación) necesita internet; el resto
// (frases, emergencias, conversor con tipos aproximados) funciona offline.
const CACHE = 'viajafacil-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return; // las llamadas a la IA/Places son POST: nunca se cachean
  const url = new URL(req.url);

  // App (mismo origen): cache-first con actualización en segundo plano; si todo falla, la portada.
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(c => c || fetch(req).then(r => {
        const cp = r.clone(); caches.open(CACHE).then(ca => ca.put(req, cp)); return r;
      }).catch(() => caches.match('./index.html')))
    );
    return;
  }

  // Tipografías de Google: cache-first (para que el diseño cargue offline).
  if (/fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(
      caches.match(req).then(c => c || fetch(req).then(r => {
        const cp = r.clone(); caches.open(CACHE).then(ca => ca.put(req, cp)); return r;
      }).catch(() => c))
    );
    return;
  }
  // Resto (IA, Places, tipos de cambio): solo red; offline lo gestiona la propia app.
});
