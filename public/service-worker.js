// Service Worker for Doshi Sensei - Offline Support & Caching
const CACHE_VERSION = 'v8-indexeddb-fix'; // Fixed IndexedDB hanging and SVG caching
const CACHE_NAMES = {
  static: `static-cache-${CACHE_VERSION}`,
  dynamic: `dynamic-cache-${CACHE_VERSION}`,
  images: `image-cache-${CACHE_VERSION}`,
  audio: `audio-cache-${CACHE_VERSION}`,
  api: `api-cache-${CACHE_VERSION}`
};

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/favicon.ico',
  '/doshi.png',
  '/manifest.json',
  '/flat-icons/story.svg',
  '/flat-icons/word.svg',
  '/flat-icons/listening.svg',
  '/flat-icons/magnifying-glass.svg',
  '/flat-icons/matching.svg',
  '/flat-icons/kana-drop.svg',
  '/flat-icons/construction.svg'
];

// API endpoints patterns to cache
const CACHEABLE_API_PATTERNS = [
  /\/api\/articles\/.*/,
  /\/api\/stories\/.*/,
  /\/api\/kanji\/.*/,
  /\/api\/vocabulary\/.*/,
  /\/api\/audio\/.*/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker v5] Installing new version...');
  console.log('[ServiceWorker] Cache version:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        // Try to cache each asset individually to avoid complete failure
        return Promise.all(
          STATIC_ASSETS.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`[ServiceWorker] Failed to cache ${url}:`, err);
              // Continue with other assets even if one fails
            });
          })
        );
      })
      .then(() => self.skipWaiting())
      .catch(err => {
        console.error('[ServiceWorker] Installation failed:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
          cacheNames
            .filter((cacheName) => !Object.values(CACHE_NAMES).includes(cacheName))
            .map((cacheName) => {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName).catch(err => {
                console.warn('[ServiceWorker] Failed to delete cache:', cacheName, err);
                // Continue with other deletions
              });
            })
        );
      }),
      // Register periodic sync for premium users
      registerPeriodicSync()
    ])
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip preload requests to avoid warnings
  if (request.mode === 'no-cors' && request.destination === 'empty') {
    return;
  }
  
  // Skip Next.js internal requests
  if (url.pathname.startsWith('/_next/') || url.pathname.includes('.next/')) {
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle image requests
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }
  
  // Handle audio requests
  if (request.destination === 'audio' || url.pathname.includes('/audio/')) {
    event.respondWith(handleAudioRequest(request));
    return;
  }
  
  // Handle other requests with network-first strategy
  event.respondWith(handleGeneralRequest(request));
});

// API request handler - cache with network fallback
async function handleApiRequest(request) {
  const cache = await caches.open(CACHE_NAMES.api);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok && shouldCacheApiRequest(request)) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fall back to cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[ServiceWorker] Serving API from cache:', request.url);
      return cachedResponse;
    }
    
    // Return error response
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'No cached data available' }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Image request handler - cache-first strategy
async function handleImageRequest(request) {
  const cache = await caches.open(CACHE_NAMES.images);
  
  // Check cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return placeholder image
    return new Response(
      '<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" fill="#999">Image unavailable offline</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

// Audio request handler - cache-first strategy
async function handleAudioRequest(request) {
  const cache = await caches.open(CACHE_NAMES.audio);
  
  // Check cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return error response
    return new Response('Audio unavailable offline', { status: 503 });
  }
}

// General request handler - network-first strategy
async function handleGeneralRequest(request) {
  const cache = await caches.open(CACHE_NAMES.dynamic);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful HTML responses
    if (networkResponse.ok && request.headers.get('accept')?.includes('text/html')) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    // Return error response
    return new Response('Offline', { status: 503 });
  }
}

// Check if API request should be cached
function shouldCacheApiRequest(request) {
  const url = new URL(request.url);
  
  // Never cache admin or script files
  if (url.pathname.includes('/admin/') || 
      url.pathname.includes('/scripts/') || 
      url.pathname.includes('fix-admin')) {
    return false;
  }
  
  return CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// Background sync for premium users
self.addEventListener('sync', async (event) => {
  // Only log in development
  if (self.location.hostname === 'localhost') {
    console.log('[ServiceWorker] Background sync:', event.tag);
  }
  
  if (event.tag === 'premium-content-sync') {
    event.waitUntil(handlePremiumSync());
  } else if (event.tag === 'sync-premium-content') {
    // Legacy support
    event.waitUntil(syncPremiumContent());
  }
});

// Legacy sync function - redirects to new sync handler
async function syncPremiumContent() {
  // Redirect to new sync handler
  return handlePremiumSync();
}

// Remove item from sync queue
async function removefromSyncQueue(id) {
  // This would interact with IndexedDB
  console.log('[ServiceWorker] Removed from sync queue:', id);
}

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
  
  if (event.data.type === 'CACHE_RESOURCE') {
    event.waitUntil(cacheResource(event.data.resource));
  }
});

// Cache a specific resource
async function cacheResource(resource) {
  const cache = await caches.open(CACHE_NAMES.dynamic);
  const response = await fetch(resource.url);
  
  if (response.ok) {
    await cache.put(resource.url, response);
  }
}

// Periodic cache cleanup (runs every hour)
setInterval(async () => {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  const now = Date.now();
  
  for (const cacheName of Object.values(CACHE_NAMES)) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      const dateHeader = response.headers.get('date');
      
      if (dateHeader) {
        const responseDate = new Date(dateHeader).getTime();
        if (now - responseDate > maxAge) {
          await cache.delete(request);
        }
      }
    }
  }
}, 60 * 60 * 1000); // Every hour

// Register periodic sync for premium users
async function registerPeriodicSync() {
  if ('periodicSync' in self.registration) {
    try {
      // Check if user is premium
      const isPremium = await checkUserPremiumStatus();
      
      if (isPremium) {
        // Request periodic sync every 6 hours
        await self.registration.periodicSync.register('premium-content-sync', {
          minInterval: 6 * 60 * 60 * 1000 // 6 hours
        });
        console.log('[ServiceWorker] Periodic sync registered for premium user');
      }
    } catch (error) {
      console.error('[ServiceWorker] Failed to register periodic sync:', error);
    }
  }
}

// Handle premium sync
async function handlePremiumSync() {
  // Only log in development
  if (self.location.hostname === 'localhost') {
    console.log('[ServiceWorker] Starting premium sync...');
  }
  
  // Check if we're online before attempting sync
  if (!self.navigator.onLine) {
    // Don't attempt sync when offline
    return;
  }
  
  // Check if user is premium before attempting sync
  const isPremium = await checkUserPremiumStatus();
  if (!isPremium) {
    // Don't attempt sync for non-premium users
    return;
  }
  
  try {
    // Send message to all clients to trigger sync
    const clients = await self.clients.matchAll({ type: 'window' });
    
    let syncTriggered = false;
    
    for (const client of clients) {
      client.postMessage({
        type: 'PREMIUM_SYNC_REQUESTED',
        timestamp: Date.now()
      });
      syncTriggered = true;
    }
    
    if (!syncTriggered) {
      console.log('[ServiceWorker] No active clients to trigger sync');
      // The sync will be triggered when a client becomes active
      return;
    }
    
    console.log('[ServiceWorker] Premium sync requested to active clients');
  } catch (error) {
    console.error('[ServiceWorker] Premium sync failed:', error);
    throw error; // Re-throw to mark sync as failed
  }
}

// Check if user is premium
async function checkUserPremiumStatus() {
  try {
    // Try to get premium status from IndexedDB
    const db = await openDB();
    const tx = db.transaction(['user-settings'], 'readonly');
    const store = tx.objectStore('user-settings');
    const settings = await store.get('premium-status');
    
    return settings?.isPremium || false;
  } catch (error) {
    console.error('[ServiceWorker] Failed to check premium status:', error);
    return false;
  }
}

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('doshi-sensei-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('user-settings')) {
        db.createObjectStore('user-settings');
      }
    };
  });
}

// Listen for periodic sync events
self.addEventListener('periodicsync', (event) => {
  console.log('[ServiceWorker] Periodic sync event:', event.tag);
  
  if (event.tag === 'premium-content-sync') {
    event.waitUntil(handlePremiumSync());
  }
});

// Handle messages from clients
self.addEventListener('message', async (event) => {
  // Existing message handlers...
  
  if (event.data.type === 'UPDATE_PREMIUM_STATUS') {
    // Update premium status in IndexedDB
    try {
      const db = await openDB();
      const tx = db.transaction(['user-settings'], 'readwrite');
      const store = tx.objectStore('user-settings');
      await store.put({ isPremium: event.data.isPremium }, 'premium-status');
      
      // Re-register periodic sync if needed
      await registerPeriodicSync();
    } catch (error) {
      console.error('[ServiceWorker] Failed to update premium status:', error);
    }
  }
  
  if (event.data.type === 'TRIGGER_PREMIUM_SYNC') {
    event.waitUntil(handlePremiumSync());
  }
});