const CACHE_NAME = 'musicas-offline-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
  // Adicione outros recursos estáticos necessários
];

// Extensões de arquivo para cachear automaticamente
const CACHEABLE_EXTENSIONS = [
  '.mp3',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif'
];

// Tamanho máximo do cache (em MB)
const MAX_CACHE_SIZE = 500; // 500MB

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE)
          .then(() => {
            console.log('Recursos essenciais cacheados com sucesso');
            return self.skipWaiting();
          })
          .catch((error) => {
            console.log('Falha ao cachear recursos essenciais:', error);
          });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker ativado e pronto para controlar clientes');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Ignora requisições não GET e de outras origens
  if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return;
  }

  // Verifica se é um arquivo de música ou imagem
  const isMediaFile = CACHEABLE_EXTENSIONS.some(ext => 
    requestUrl.pathname.endsWith(ext)
  );

  if (isMediaFile) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Retorna do cache se existir
        if (cachedResponse) {
          console.log('Retornando do cache:', requestUrl.pathname);
          return cachedResponse;
        }

        // Se não estiver no cache, faz a requisição
        return fetch(event.request).then((networkResponse) => {
          // Verifica se a resposta é válida
          if (!networkResponse || networkResponse.status !== 200 || 
              networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Clona a resposta para armazenar no cache
          const responseToCache = networkResponse.clone();
          
          caches.open(CACHE_NAME).then((cache) => {
            // Verifica o tamanho do cache antes de adicionar
            cache.put(event.request, responseToCache).then(() => {
              console.log('Arquivo armazenado no cache:', requestUrl.pathname);
              return cleanCacheIfNeeded();
            });
          });

          return networkResponse;
        }).catch((error) => {
          console.log('Erro ao buscar recurso:', error);
          // Pode retornar uma resposta alternativa aqui se desejar
          return new Response(JSON.stringify({
            error: 'Você está offline e este recurso não está disponível'
          }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
    );
  } else {
    // Para outros recursos (HTML, CSS, JS), usa estratégia Cache First
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).then((response) => {
          return response;
        });
      })
    );
  }
});

// Função para limpar o cache se exceder o tamanho máximo
async function cleanCacheIfNeeded() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  
  // Verifica o tamanho total do cache
  let totalSize = 0;
  const entries = [];
  
  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const contentLength = response.headers.get('content-length');
      const size = contentLength ? parseInt(contentLength) : 0;
      totalSize += size;
      entries.push({
        request,
        response,
        size,
        lastUsed: await getLastUsed(request.url)
      });
    }
  }
  
  // Se o cache exceder o tamanho máximo, remove os itens mais antigos
  if (totalSize > MAX_CACHE_SIZE * 1024 * 1024) {
    console.log(`Cache excedeu ${MAX_CACHE_SIZE}MB, limpando...`);
    
    // Ordena por último uso (os mais antigos primeiro)
    entries.sort((a, b) => a.lastUsed - b.lastUsed);
    
    let cleanedSize = 0;
    const targetSize = totalSize - (MAX_CACHE_SIZE * 1024 * 1024 * 0.8); // Limpa até 80% do máximo
    
    for (const entry of entries) {
      if (cleanedSize >= targetSize) break;
      
      await cache.delete(entry.request);
      cleanedSize += entry.size;
      console.log('Removido do cache:', entry.request.url);
    }
    
    console.log(`Limpados ${cleanedSize / (1024 * 1024)}MB do cache`);
  }
}

// Função auxiliar para obter o último uso de um recurso
async function getLastUsed(url) {
  // Você pode implementar um sistema mais sofisticado aqui
  // usando IndexedDB para rastrear quando cada recurso foi acessado
  return 0; // Implementação simplificada
}

// Mensagens do Service Worker
self.addEventListener('message', (event) => {
  if (event.data.action === 'cleanCache') {
    cleanCacheIfNeeded();
  } else if (event.data.action === 'cacheSong') {
    const songUrl = event.data.url;
    caches.open(CACHE_NAME).then(cache => {
      fetch(songUrl).then(response => {
        if (response.ok) {
          cache.put(songUrl, response.clone());
          console.log('Música cacheadada manualmente:', songUrl);
        }
      });
    });
  }
});