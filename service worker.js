const CACHE_NAME = 'spotify-cache-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/screenshot-1.png',
  '/icons/screenshot-2.png',

  // Músicas - adicionar timestamp para evitar cache
  '/musicas/aguas-passadas.mp3',
  '/musicas/amores-rasos.mp3',
  '/musicas/andei.mp3',
  '/musicas/cansado.mp3',
  '/musicas/eu-venci.mp3',
  '/musicas/insuficiencia-cosmica.mp3',
  '/musicas/judas.mp3',
  '/musicas/melodias.mp3',
  '/musicas/morte.mp3',
  '/musicas/nuvens.mp3',
  '/musicas/o-ciclo-odioso.mp3',
  '/musicas/sacrilegio-inepto.mp3',
  '/musicas/trela.mp3',
  '/musicas/vivendo-o-passado.mp3',
  '/musicas/querido-Deus.mp3',

  // Capas
  '/musicas/covers/aguas-passadas.jpeg',
  '/musicas/covers/amores-rasos.jpeg',
  '/musicas/covers/andei.jpeg',
  '/musicas/covers/cansado.webp',
  '/musicas/covers/eu-venci.jpg',
  '/musicas/covers/insuficiencia-cosmica.jpeg',
  '/musicas/covers/judas.avif',
  '/musicas/covers/melodias.jpeg',
  '/musicas/covers/morte.jpg',
  '/musicas/covers/nuvens.jpeg',
  '/musicas/covers/o-ciclo-odioso.jpeg',
  '/musicas/covers/sacrilegio-inepto.avif',
  '/musicas/covers/trela.jpeg',
  '/musicas/covers/vivendo-o-passado.jpeg',
  '/musicas/covers/querido-Deus.jpg'
];

// Instala e faz cache inicial
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  
  // Pular a espera para ativação imediata
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cacheando recursos críticos');
        // Cachear apenas os recursos críticos primeiro
        return cache.addAll([
          '/',
          '/index.html',
          '/style.css',
          '/script.js',
          '/manifest.json',
          '/icons/icon-192x192.png',
          '/icons/icon-512x512.png'
        ]);
      })
      .then(() => {
        // Iniciar cache dos outros recursos em background
        console.log('[Service Worker] Iniciando cache de recursos em background');
        caches.open(CACHE_NAME).then(cache => {
          // Estratégia: cachear um por vez para não bloquear a instalação
          urlsToCache.slice(5).forEach(url => {
            fetch(url)
              .then(response => {
                if (response.status === 200) {
                  cache.put(url, response);
                }
              })
              .catch(() => {
                // Ignorar erros para recursos não críticos
              });
          });
        });
      })
  );
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
    ).then(() => {
      // Tomar controle de todas as abas abertas
      return self.clients.claim();
    })
  );
});

// Estratégia de cache: Stale-While-Revalidate para melhoria de performance
self.addEventListener('fetch', event => {
  // Para requisições de áudio, usar estratégia cache-first com fallback para network
  if (event.request.url.includes('/musicas/')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Retornar do cache se disponível
          if (response) {
            // Atualizar o cache em background
            fetch(event.request)
              .then(fetchResponse => {
                if (fetchResponse && fetchResponse.status === 200) {
                  const responseToCache = fetchResponse.clone();
                  caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                  });
                }
              })
              .catch(() => {
                // Falha silenciosa na atualização
              });
            return response;
          }
          
          // Se não está no cache, buscar da rede
          return fetch(event.request)
            .then(fetchResponse => {
              // Verificar se recebemos uma resposta válida
              if (!fetchResponse || fetchResponse.status !== 200) {
                return fetchResponse;
              }
              
              // Clonar a resposta
              const responseToCache = fetchResponse.clone();
              
              // Adicionar ao cache
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              
              return fetchResponse;
            })
            .catch(error => {
              console.log('Fetch failed; returning offline page instead.', error);
              // Poderíamos retornar uma fallback page aqui se necessário
              throw error;
            });
        })
    );
    return;
  }
  
  // Para outros recursos, usar estratégia Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Sempre fazer fetch para atualizar o cache
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Verificar se a resposta é válida
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Clonar a resposta
            const responseToCache = networkResponse.clone();
            
            // Atualizar o cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch(error => {
            console.log('Fetch failed:', error);
            // Em caso de erro, não fazer nada
          });
        
        // Retornar a resposta do cache imediatamente, depois atualizar
        return response || fetchPromise;
      })
  );
});

// Mensagens entre o Service Worker e a página
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});