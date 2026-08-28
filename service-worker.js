const CACHE='localfy-shell-v3';
const SHELL=['./','./index.html','./style.css','./sync-config.js','./sync.js','./script.js','./manifest.json','./icons/icon-192x192.png','./icons/icon-512x512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;if(event.request.destination==='audio'){event.respondWith(fetch(event.request).catch(()=>new Response('',{status:503})));return}event.respondWith(fetch(event.request).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,clone))}return response}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html'))))});
