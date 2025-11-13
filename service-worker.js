// Verhoogd naar v3 voor de nieuwe cache-strategie
const CACHE_NAME = 'workout-timer-v3';

// De basisbestanden die de app nodig heeft om te draaien
const APP_SHELL_FILES = [
    'index.html',
    'manifest.json' 
    // We laten de assets (video's/gifs) hier bewust weg.
];

// 1. Installatie: Cache nu ALLEEN de App Shell
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installeren v3...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching App Shell');
                // Alleen de basisbestanden. Media wordt dynamisch gecached.
                return cache.addAll(APP_SHELL_FILES);
            })
            .then(() => {
                self.skipWaiting(); // Forceer de nieuwe service worker om actief te worden
            })
    );
});

// 2. Activeren: Ruim oude caches op
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activeren v3...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    // Verwijder alle caches die niet de *nieuwe* cache-naam hebben
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Oude cache opruimen:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Claim controle over open pagina's
    );
});

// 3. Fetch: "Cache-First, then Network" strategie (ook voor media)
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Cache-first strategie
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                
                // 1. Gevonden in cache (Snel!)
                if (cachedResponse) {
                    // console.log('[Service Worker] Opgehaald uit cache:', event.request.url);
                    return cachedResponse;
                }

                // 2. Niet in cache, ga naar netwerk
                // console.log('[Service Worker] Opgehaald van netwerk:', event.request.url);
                return fetch(event.request)
                    .then((networkResponse) => {
                        
                        // Controleer of we een geldig antwoord hebben
                        if (!networkResponse || networkResponse.status !== 200) {
                            // Als het een 404 is (video niet gevonden), geef het gewoon door.
                            return networkResponse;
                        }

                        // Maak een kopie van het antwoord om te cachen
                        const responseToCache = networkResponse.clone();

                        // Sla het nieuwe antwoord op in de cache
                        // Dit is hoe we de video/gif cachen NADAT het is geladen.
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
