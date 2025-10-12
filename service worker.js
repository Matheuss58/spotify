const CACHE_NAME = 'spotify-cache-v7';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// Adicione aqui as músicas e capas que deseja cachear
const musicFiles = [
  'musicas/aguas-passadas.mp3',
  'musicas/cavaleiro-da-lua',
  'musicas/amores-rasos.mp3',
  'musicas/andei.mp3',
  'musicas/cansado.mp3',
  'musicas/eu-venci.mp3',
  'musicas/insuficiencia-cosmica.mp3',
  'musicas/judas.mp3',
  'musicas/melodias.mp3',
  'musicas/morte.mp3',
  'musicas/nuvens.mp3',
  'musicas/o-ciclo-odioso.mp3',
  'musicas/sacrilegio-inepto.mp3',
  'musicas/trela.mp3',
  'musicas/vivendo-o-passado.mp3',
  'musicas/querido-Deus.mp3'
];

// Cache de capas (ajuste conforme suas extensões)
const coverExtensions = ['avif', 'jpg', 'jpeg', 'png', 'webp'];
const coverFiles = [];
musicFiles.forEach(song => {
  const songName = song.replace('musicas/', '').replace('.mp3', '');
  coverExtensions.forEach(ext => {
    coverFiles.push(`musicas/covers/${songName}.${ext}`);
  });
});

// Instalação - Cache todos os recursos
self.addEventListener('install', event => {
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache recursos estáticos
        cache.addAll(urlsToCache);
        
        // Cache músicas e capas individualmente
        musicFiles.forEach(music => {
          fetch(music).then(response => {
            if (response.ok) cache.put(music, response);
          }).catch(() => {});
        });
        
        coverFiles.forEach(cover => {
          fetch(cover).then(response => {
            if (response.ok) cache.put(cover, response);
          }).catch(() => {});
        });
        
        return true;
      })
  );
});

// Ativação - Limpe caches antigos
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

// Estratégia de cache: Cache First com fallback para network
self.addEventListener('fetch', event => {
  // Para requisições de mesma origem
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          // Retorna do cache se encontrado
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Se não está no cache, busca na rede e armazena
          return fetch(event.request)
            .then(networkResponse => {
              if (!networkResponse || networkResponse.status !== 200) {
                return networkResponse;
              }
              
              // Clona a resposta para armazenar no cache
              const responseToCache = networkResponse.clone();
              
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              
              return networkResponse;
            })
            .catch(error => {
              // Fallback para recursos críticos
              if (event.request.url.includes('.html')) {
                return caches.match('./index.html');
              }
              return new Response('', { status: 404 });
            });
        })
    );
  }
});