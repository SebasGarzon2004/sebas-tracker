// Service worker: guarda una copia de la app en el teléfono para que
// funcione sin internet y cargue al instante. Estrategia "red primero,
// caché de respaldo": si hay conexión, siempre trae la versión más nueva
// (y la deja guardada); si no hay conexión, usa la última copia guardada.
const CACHE_NAME = 'gastos-cache-v2';
const ARCHIVOS_BASE = [
  './',
  './index.html',
  './logic.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_BASE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;
  evento.respondWith(
    fetch(evento.request, { cache: 'no-store' })
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(evento.request, copia));
        return respuesta;
      })
      .catch(() => caches.match(evento.request))
  );
});
