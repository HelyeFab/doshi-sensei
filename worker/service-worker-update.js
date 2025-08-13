// Service Worker Version Management
// This ensures old cached chunks are cleared when deploying new versions

const SW_VERSION = 'v2.0.0-' + Date.now(); // Dynamic version based on deploy time

// Clear old caches on activation
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => {
            // Delete old version caches
            return cacheName.startsWith('workbox-') && 
                   !cacheName.includes(SW_VERSION);
          })
          .map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('[SW] Version', SW_VERSION, 'activated');
      // Take control immediately
      return self.clients.claim();
    })
  );
});

// Skip waiting when new version is available
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting triggered');
    self.skipWaiting();
  }
});

// Export version for use in other scripts
if (typeof workbox !== 'undefined') {
  workbox.core.setCacheNameDetails({
    suffix: SW_VERSION
  });
}