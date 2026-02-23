// Aquest és el nom de la nostra memòria cau (Cache)
const CACHE_NAME = 'upan-cache-v1';

// Llista d'arxius que volem guardar al mòbil per quan no hi hagi internet
const urlsToCache = [
  './',               // La pàgina principal
  './index.html'      // L'arxiu HTML
];

// 1. FASE D'INSTAL·LACIÓ: Guardem els arxius a la Cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Arxius guardats a la memòria cau correctament');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. FASE DE LECTURA (INTERCEPTOR): Què fem quan l'usuari refresca la pàgina?
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si l'arxiu està a la Cache (fins i tot sense internet), el retornem!
        if (response) {
          return response;
        }
        // Si no hi és, anem a internet a buscar-lo
        return fetch(event.request);
      })
  );
});
