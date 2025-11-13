const CACHE_NAME = 'workout-timer-v1';
const APP_SHELL_FILES = [
    'index.html'
];

// 1. Installatie: Cache de "App Shell" (de basis HTML)
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installeren...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching App Shell');
                return cache.addAll(APP_SHELL_FILES);
            })
            .then(() => {
                self.skipWaiting(); // Forceer de nieuwe service worker om actief te worden
            })
    );
});

// 2. Activeren: Ruim oude caches op
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activeren...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Oude cache opruimen:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Claim controle over open pagina's
    );
});

// 3. Fetch: Haal bestanden op (Cache-first, dan netwerk)
self.addEventListener('fetch', (event) => {
    // We willen alleen GET-verzoeken cachen
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Cache-first strategie
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                
                // 1. Gevonden in cache
                if (cachedResponse) {
                    // console.log('[Service Worker] Opgehaald uit cache:', event.request.url);
                    return cachedResponse;
                }

                // 2. Niet in cache, ga naar netwerk
                return fetch(event.request)
                    .then((networkResponse) => {
                        
                        // Controleer of we een geldig antwoord hebben
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // Maak een kopie van het antwoord
                        const responseToCache = networkResponse.clone();

                        // Sla het nieuwe antwoord op in de cache
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                // console.log('[Service Worker] Caching nieuw bestand:', event.request.url);
                                cache.put(event.request, responseToCache);
                            });
                        
                        return networkResponse;
                    })
                    .catch(error => {
                        console.error('[Service Worker] Fetch mislukt:', error);
                        // Je zou hier een offline fallback-pagina kunnen tonen
                    });
            })
    );
});