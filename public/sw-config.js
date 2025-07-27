// Service Worker Configuration
// This file is imported by the service worker to handle cache versioning

// IMPORTANT: Update this version when deploying new releases
const SW_VERSION = '1.0.0';
const CACHE_PREFIX = 'doshi-sensei-';

// Cache names with versioning
const CACHE_NAMES = {
  PRECACHE: `${CACHE_PREFIX}precache-v${SW_VERSION}`,
  RUNTIME: `${CACHE_PREFIX}runtime-v${SW_VERSION}`,
  IMAGES: `${CACHE_PREFIX}images-v${SW_VERSION}`,
  EXTERNAL: `${CACHE_PREFIX}external-v${SW_VERSION}`,
};

// List of caches to keep (current version only)
const CACHES_TO_KEEP = Object.values(CACHE_NAMES);

// Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete caches that don't match current version
          if (cacheName.startsWith(CACHE_PREFIX) && !CACHES_TO_KEEP.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Received SKIP_WAITING, activating new service worker');
    self.skipWaiting();
  }
});