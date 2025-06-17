// Doshi Sensei Service Worker - Clean version to prevent sync issues
const CACHE_NAME = 'doshi-sensei-v1';
const STATIC_CACHE_NAME = 'doshi-sensei-static-v1';

// Essential files to cache (only core files, no build artifacts)
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/doshi.png',
  '/manifest.json',
  '/icon.svg'
];

// Install event - cache essential files only
self.addEventListener('install', (event) => {
  console.log('🔧 Service worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching essential files');
        return cache.addAll(STATIC_ASSETS.filter(url => url !== '/_next/app-build-manifest.json'));
      })
      .then(() => {
        console.log('✅ Service worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service worker install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - network first for API calls, cache for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't interfere with Firebase or API calls
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic')
  ) {
    // Let these requests go directly to network
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Offline fallback
          return caches.match('/offline') || caches.match('/');
        })
    );
    return;
  }

  // Handle static assets
  if (request.destination === 'image' || request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      caches.open(CACHE_NAME)
        .then((cache) => {
          return cache.match(request)
            .then((response) => {
              if (response) {
                return response;
              }
              return fetch(request)
                .then((fetchResponse) => {
                  // Only cache successful responses
                  if (fetchResponse.status === 200) {
                    cache.put(request, fetchResponse.clone());
                  }
                  return fetchResponse;
                });
            });
        })
    );
  }
});

// Message handler for manual cache refresh
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
          );
        })
        .then(() => {
          console.log('🧹 All caches cleared');
          event.ports[0].postMessage({ success: true });
        })
    );
  }
});

console.log('🌟 Doshi Sensei Service Worker loaded - Firebase sync friendly!');
