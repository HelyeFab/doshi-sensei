// Custom Service Worker Extensions for Doshi Sensei
// This file extends the Workbox-generated service worker

self.addEventListener('install', (event) => {
  console.log('[Custom SW] Installing custom service worker extensions...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Custom SW] Activating custom service worker...');
  event.waitUntil(clients.claim());
});

// Handle fetch events with custom logic
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip service worker for RSC requests
  if (url.searchParams.has('_rsc') || request.headers.get('RSC') === '1') {
    console.log('[Custom SW] Bypassing cache for RSC request:', url.pathname);
    return; // Let the browser handle it
  }
  
  // Skip service worker for Next.js HMR in development
  if (url.pathname.includes('_next/webpack-hmr') || 
      url.pathname.includes('__nextjs') ||
      url.pathname.includes('_next/static/development')) {
    return;
  }
  
  // For API routes, always go to network
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return a custom offline response for API routes
        return new Response(
          JSON.stringify({ error: 'Offline - API unavailable' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }
  
  // For navigation requests to problematic pages, use network-first
  if (request.mode === 'navigate') {
    const problematicPaths = ['/vocabulary', '/drill', '/practice', '/news', '/stories', '/admin'];
    const isProblematicPath = problematicPaths.some(path => url.pathname.startsWith(path));
    
    if (isProblematicPath) {
      event.respondWith(
        fetch(request)
          .then(response => {
            // Only cache successful responses
            if (response.status === 200) {
              const responseToCache = response.clone();
              caches.open('dynamic-pages-v1').then(cache => {
                cache.put(request, responseToCache);
              });
            }
            return response;
          })
          .catch(() => {
            // Fallback to cache if offline
            return caches.match(request).then(cachedResponse => {
              if (cachedResponse) {
                console.log('[Custom SW] Serving from cache (offline):', url.pathname);
                return cachedResponse;
              }
              // Return offline page if no cache
              return caches.match('/offline.html');
            });
          })
      );
      return;
    }
  }
  
  // Let Workbox handle all other requests
});

// Clean up old caches periodically
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAN_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Keep only recent caches
            if (!cacheName.includes('-v1') && !cacheName.includes('precache')) {
              console.log('[Custom SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  }
});