const CACHE_NAME = 'upan-cache-v5';

const urlsToCache = [
  './',
  './index.html',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js' // La nova llibreria offline!
];

// 1. INSTAL·LACIÓ
self.addEventListener('install', event => {
  self.skipWaiting(); // Forcem que el nou Service Worker s'activi immediatament
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. ACTIVACIÓ (Neteja de brossa antiga)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          // Si trobem una memòria antiga (ex: v1 o v2), l'esborrem
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. INTERCEPTOR: Estratègia "Network First" (Primer Internet, després Cau)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si hi ha internet, aprofitem per guardar la versió més nova a la Cache per si després en perdem
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response; // I mostrem la web normal
      })
      .catch(() => {
        // ERROR: No hi ha internet! Doncs traiem la web que teníem guardada a la Cache
        return caches.match(event.request);
      })
  );
});
