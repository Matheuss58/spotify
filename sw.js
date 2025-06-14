// sw.js atualizado (com cache dinâmico)
const CACHE_NAME = 'musicas-v2';
const DYNAMIC_CACHE = 'dynamic-musicas-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([
        '/',
        '/index.html',
        '/style.css',
        '/script.js',
        '/icon-192.png'
      ]))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request)
      .then(cacheRes => {
        return cacheRes || fetch(e.request).then(fetchRes => {
          return caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(e.request.url, fetchRes.clone());
            return fetchRes;
          });
        });
      })
  );
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registrado:', registration);
      })
      .catch(error => {
        console.log('Falha no registro do SW:', error);
      });
  });
}