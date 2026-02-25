const CACHE_NAME = 'upan-cache-v8';

const urlsToCache = [
  './',
  './index.html',
  './app.js', // <--- ARA SÍ! Guardem el fitxer que té la lògica de la web
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js'
];

// 1. INSTAL·LACIÓ
self.addEventListener('install', event => {
  self.skipWaiting();
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
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. INTERCEPTOR: Estratègia "Network First"
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          if(event.request.url.startsWith('http')){
             cache.put(event.request, responseClone);
          }
        });
        return response;
      })
      .catch(() => {
        // Si no hi ha internet, servim des de la memòria
        return caches.match(event.request);
      })
  );
});
