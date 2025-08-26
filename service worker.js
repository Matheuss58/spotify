const CACHE_NAME = 'spotify-cache-v6';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// Instala e faz cache inicial
self.addEventListener('install', event => {
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativa e remove caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => 
      Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Estratégia de cache otimizada para mobile
self.addEventListener('fetch', event => {
  // Para requisições de áudio e imagens, não usar cache
  if (event.request.url.includes('/musicas/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return response;
        })
        .catch(error => {
          console.log('Fetch failed for media:', error);
          return new Response('', { status: 404 });
        })
    );
    return;
  }
  
  // Para outros recursos, usar estratégia network first
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        
        const responseToCache = networkResponse.clone();
        
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
        
        return networkResponse;
      })
      .catch(error => {
        return caches.match(event.request);
      })
  );
});