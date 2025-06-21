const CACHE_NAME = 'spotify-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',

  // Músicas
  '/musicas/xeque-mate.mp3',
  '/musicas/olhos vazios.mp3',
  '/musicas/akuma no mi.mp3',
  '/musicas/aguas passadas.mp3',
  '/musicas/amores rasos.mp3',
  '/musicas/andei.mp3',
  '/musicas/cansado.mp3',
  '/musicas/eu venci.mp3',
  '/musicas/gato da caixa.mp3',
  '/musicas/insuficiencia cosmica.mp3',
  '/musicas/judas.mp3',
  '/musicas/morte.mp3',
  '/musicas/nuvens.mp3',
  '/musicas/o ciclo odioso.mp3',
  '/musicas/sacrilegio inepto.mp3',
  '/musicas/sozin.mp3',
  '/musicas/trela.mp3',
  '/musicas/vivendo o passado.mp3',

  // Capas (formato .avif, se tiver outros formatos adiciona aqui)
  '/musicas/covers/xeque-mate.jpeg',
  '/musicas/covers/olhos vazios.jpeg',
  '/musicas/covers/akuma no mi.jpeg',
  '/musicas/covers/aguas passadas.jpeg',
  '/musicas/covers/amores rasos.jpeg',
  '/musicas/covers/andei.jpeg',
  '/musicas/covers/cansado.webp',
  '/musicas/covers/eu venci.jpg',
  '/musicas/covers/gato da caixa.jpeg',
  '/musicas/covers/insuficiencia cosmica.jpeg',
  '/musicas/covers/judas.avif',
  '/musicas/covers/morte.jpg',
  '/musicas/covers/nuvens.jpeg',
  '/musicas/covers/o ciclo odioso.jpeg',
  '/musicas/covers/sacrilegio inepto.avif',
  '/musicas/covers/sozin.webp',
  '/musicas/covers/trela.jpeg',
  '/musicas/covers/vivendo o passado.jpeg'
];

// Instala e faz cache inicial
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cacheando arquivos');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Ativa e remove caches antigos
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativando...');
  event.waitUntil(
    caches.keys().then(cacheNames => 
      Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deletando cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Intercepta requisições
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se achou no cache, retorna
        if (response) {
          return response;
        }
        // Caso contrário, busca na rede e tenta adicionar no cache dinamicamente
        return fetch(event.request).then(fetchResponse => {
          // Se não for válido, retorna direto
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }

          // Clona e adiciona no cache
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return fetchResponse;
        });
      }).catch(() => {
        // Se estiver offline e não tiver cache, pode retornar uma página de fallback (opcional)
        // return caches.match('/offline.html');
      })
  );
});
