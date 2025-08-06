// Enhanced Service Worker with PWA features
// Includes background sync, smart caching, and offline support

const CACHE_VERSION = 'v2';
const CACHE_NAME = `doshi-sensei-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const AUDIO_CACHE = `audio-${CACHE_VERSION}`;
const VOCABULARY_CACHE = `vocabulary-${CACHE_VERSION}`;

// Files to cache on install
const STATIC_CACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
  '/doshi.png',
  '/fonts/rubik-v28-latin-regular.woff2',
  '/fonts/noto-sans-jp-v52-japanese_latin-regular.woff2'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('doshi-sensei-') && name !== CACHE_NAME;
          })
          .map((name) => caches.delete(name))
      );
    })
  );
  
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Audio files - cache first with fallback
  if (url.pathname.includes('/audio/') || url.pathname.includes('/api/tts')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(AUDIO_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }
  
  // Vocabulary data - stale while revalidate
  if (url.pathname.includes('/data/tatoeba/') || 
      url.pathname.includes('/data/textbook-vocabulary/') ||
      url.pathname.includes('/data/vocabulary/')) {
    event.respondWith(
      caches.open(VOCABULARY_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
          
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }
  
  // API calls - network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }
  
  // Default strategy - cache first for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(request).then((response) => {
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        
        // Don't cache browser-sync or hot-reload
        if (url.hostname === 'localhost' && 
            (url.pathname.includes('_next') || url.pathname.includes('webpack'))) {
          return response;
        }
        
        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });
        
        return response;
      }).catch(() => {
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/offline');
        }
      });
    })
  );
});

// Background Sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'doshi-sync') {
    event.waitUntil(performBackgroundSync());
  }
});

// Perform background sync
async function performBackgroundSync() {
  try {
    // Get all clients
    const clients = await self.clients.matchAll();
    
    // Send message to all clients to trigger sync
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        timestamp: Date.now()
      });
    });
    
    // The actual sync will be handled by the backgroundSync service
    // when it receives the message
    
    return Promise.resolve();
  } catch (error) {
    console.error('Background sync failed:', error);
    return Promise.reject(error);
  }
}

// Periodic Background Sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'doshi-periodic-sync') {
    event.waitUntil(performPeriodicSync());
  }
});

async function performPeriodicSync() {
  // Periodic sync for checking spaced repetition reminders
  try {
    const clients = await self.clients.matchAll();
    
    clients.forEach(client => {
      client.postMessage({
        type: 'CHECK_SPACED_REPETITION',
        timestamp: Date.now()
      });
    });
    
    return Promise.resolve();
  } catch (error) {
    console.error('Periodic sync failed:', error);
    return Promise.reject(error);
  }
}

// Push event for notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Time to review your vocabulary!',
    icon: '/doshi.png',
    badge: '/favicon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'review',
        title: 'Review Now',
        icon: '/icons/check.png'
      },
      {
        action: 'later',
        title: 'Later',
        icon: '/icons/close.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Doshi Sensei - Review Time!', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'review') {
    // Open the app to review page
    event.waitUntil(
      clients.openWindow('/tools/word-learning-session')
    );
  }
  // If 'later' or no action, just close the notification
});

// Message event for communication with clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_AUDIO') {
    // Cache audio file on demand
    const { url, audio } = event.data;
    caches.open(AUDIO_CACHE).then(cache => {
      cache.put(url, new Response(audio));
    });
  }
  
  if (event.data && event.data.type === 'PREFETCH_VOCABULARY') {
    // Prefetch vocabulary data
    const { lessonIds } = event.data;
    caches.open(VOCABULARY_CACHE).then(cache => {
      lessonIds.forEach(lessonId => {
        const urls = [
          `/data/textbook-vocabulary/genki/${lessonId}.json`,
          `/data/textbook-vocabulary/minna/${lessonId}.json`
        ];
        
        urls.forEach(url => {
          fetch(url).then(response => {
            if (response.ok) {
              cache.put(url, response);
            }
          }).catch(() => {
            // Ignore errors for non-existent files
          });
        });
      });
    });
  }
});

// Cache size management
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    const keysToDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
}

// Periodically trim caches
setInterval(() => {
  trimCache(AUDIO_CACHE, 100);
  trimCache(VOCABULARY_CACHE, 50);
  trimCache(RUNTIME_CACHE, 100);
}, 60 * 60 * 1000); // Every hour