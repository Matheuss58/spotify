const CACHE_NAME = 'spotify-free-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Extensões para cache automático
const CACHEABLE_EXTENSIONS = [
  '.mp3',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif'
];

// Taman

// Tamanho máximo do cache (500MB)
const MAX_CACHE_SIZE = 500 * 1024 * 1024;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto, adicionando recursos estáticos');
        return cache.addAll(ASSETS_TO_CACHE)
          .then(() => {
            console.log('Todos os recursos essenciais foram cacheados');
            return self.skipWaiting();
          });
      })
      .catch((error) => {
        console.error('Falha ao cachear recursos essenciais:', error);
        throw error;
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
    })
    .then(() => {
      console.log('Service Worker ativado com sucesso');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  
  // Ignora requisições não-GET e de outras origens
  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return;
  }

  // Verifica se é um arquivo de mídia
  const isMediaFile = CACHEABLE_EXTENSIONS.some(ext => 
    requestUrl.pathname.endsWith(ext)
  );

  if (isMediaFile) {
    handleMediaRequest(event, request);
  } else {
    handleCoreRequest(event, request);
  }
});

async function handleMediaRequest(event, request) {
  try {
    // Primeiro tenta buscar no cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('Retornando do cache:', request.url);
      return event.respondWith(cachedResponse);
    }

    // Se não estiver no cache, faz a requisição de rede
    const networkResponse = await fetch(request);
    
    // Verifica se a resposta é válida
    if (!networkResponse || networkResponse.status !== 200 || 
        networkResponse.type !== 'basic') {
      return event.respondWith(networkResponse);
    }

    // Clona a resposta para armazenar no cache
    const responseToCache = networkResponse.clone();
    
    // Adiciona ao cache e limpa se necessário
    await addToCache(request, responseToCache);
    
    return event.respondWith(networkResponse);
    
  } catch (error) {
    console.error('Erro ao processar requisição de mídia:', error);
    return event.respondWith(
      new Response(JSON.stringify({
        error: 'Recurso não disponível offline'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    );
  }
}

async function handleCoreRequest(event, request) {
  try {
    // Estratégia Cache First para recursos principais
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return event.respondWith(cachedResponse);
    }
    
    const networkResponse = await fetch(request);
    return event.respondWith(networkResponse);
    
  } catch (error) {
    console.error('Erro ao processar requisição principal:', error);
    
    // Fallback para a página principal se for uma requisição HTML
    if (request.headers.get('accept').includes('text/html')) {
      const fallbackResponse = await caches.match('/index.html');
      if (fallbackResponse) {
        return event.respondWith(fallbackResponse);
      }
    }
    
    return event.respondWith(new Response('Offline', { status: 503 }));
  }
}

async function addToCache(request, response) {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response);
  console.log('Recurso armazenado no cache:', request.url);
  
  // Verifica o tamanho do cache periodicamente
  await cleanCacheIfNeeded();
}

async function cleanCacheIfNeeded() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  
  let totalSize = 0;
  const entries = [];
  
  // Calcula o tamanho total do cache
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const contentLength = response.headers.get('content-length');
      const size = contentLength ? parseInt(contentLength) : 0;
      totalSize += size;
      entries.push({ request, size });
    }
  }
  
  // Limpa o cache se exceder o tamanho máximo
  if (totalSize > MAX_CACHE_SIZE) {
    console.log(`Cache excedeu o limite (${MAX_CACHE_SIZE} bytes), limpando...`);
    
    // Ordena por tamanho (maiores primeiro)
    entries.sort((a, b) => b.size - a.size);
    
    let cleanedSize = 0;
    const targetSize = totalSize - (MAX_CACHE_SIZE * 0.8); // Limpa até 80% do máximo
    
    for (const entry of entries) {
      if (cleanedSize >= targetSize) break;
      
      await cache.delete(entry.request);
      cleanedSize += entry.size;
      console.log(`Removido: ${entry.request.url} (${entry.size} bytes)`);
    }
    
    console.log(`Total limpo: ${cleanedSize} bytes`);
  }
}

self.addEventListener('message', async (event) => {
  switch (event.data.action) {
    case 'cleanCache':
      await cleanCacheIfNeeded();
      break;
      
    case 'cacheSong':
      try {
        const { url } = event.data;
        const cache = await caches.open(CACHE_NAME);
        const response = await fetch(url);
        
        if (response.ok) {
          await cache.put(url, response.clone());
          console.log(`Música cacheadada manualmente: ${url}`);
          event.ports[0].postMessage({ success: true });
        } else {
          throw new Error('Resposta não OK');
        }
      } catch (error) {
        console.error('Erro ao cachear música:', error);
        event.ports[0].postMessage({ success: false, error: error.message });
      }
      break;
      
    case 'getCacheStatus':
      const cache = await caches.open(CACHE_NAME);
      const requests = await cache.keys();
      const cachedSongs = requests
        .filter(req => req.url.includes('musicas/'))
        .map(req => req.url);
      
      event.ports[0].postMessage({ cachedSongs });
      break;
  }
});