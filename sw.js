const CACHE_NAME = '2048-dark-v32';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/game.js',
  '/settings.html',
  '/settings.js'
];

// Install service worker and cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache opened successfully
        return cache.addAll(urlsToCache);
      })
  );
  // Force the new service worker to activate immediately
  self.skipWaiting();
});

// Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            // Delete old cache version
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip requests from extensions and dev server
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  
  // Skip ALL localhost requests to avoid interfering with development
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return;
  }
  
  // Skip Vite HMR and dev server requests
  if (url.pathname.includes('/@vite') || 
      url.pathname.includes('/@fs') ||
      url.pathname.includes('/__vite') ||
      url.pathname.includes('.hot-update') ||
      url.pathname.includes('node_modules')) {
    return;
  }
  
  // Skip external resources (CDNs, analytics, etc)
  if (!url.hostname.includes(self.location.hostname) && 
      !url.hostname.includes('github.io')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request).then(fetchResponse => {
          // Don't cache non-successful responses
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }

          // Clone the response
          const responseToCache = fetchResponse.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return fetchResponse;
        });
      })
      .catch(error => {
        // Offline fallback for documents only
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
        // For other resources, return a network error response
        return new Response('Network error', {
          status: 408,
          statusText: 'Network error',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      })
  );
});