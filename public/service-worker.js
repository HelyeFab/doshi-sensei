// PRODUCTION-SAFE Service Worker with Auto-Recovery
// Version: 2.0.0 - Includes automatic cache corruption detection and recovery

const SW_VERSION = '2.0.0';
const CACHE_VERSION = 'v11-safe';
const CACHE_NAMES = {
  static: `static-cache-${CACHE_VERSION}`,
  dynamic: `dynamic-cache-${CACHE_VERSION}`,
  images: `image-cache-${CACHE_VERSION}`,
  audio: `audio-cache-${CACHE_VERSION}`,
  api: `api-cache-${CACHE_VERSION}`
};

// Maximum redirect count before we consider it a loop
const MAX_REDIRECTS = 3;

// Track redirect counts per URL
const redirectCounts = new Map();

// Critical: Add cache corruption detection
const CACHE_HEALTH_CHECK_KEY = 'cache-health-check';
const CACHE_HEALTH_CHECK_VALUE = `healthy-${SW_VERSION}`;

// Assets to cache on install (minimal set)
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json'
];

// API endpoints that are safe to cache
const SAFE_CACHEABLE_API_PATTERNS = [
  /\/api\/articles\/.*/,
  /\/api\/stories\/.*/,
  /\/api\/vocabulary\/.*/
];

// Never cache these patterns (high risk of corruption)
const NEVER_CACHE_PATTERNS = [
  /\/api\/auth\/.*/,
  /\/api\/admin\/.*/,
  /\/api\/webhook\/.*/,
  /\/_next\/.*/,
  /\.next\/.*/,
  /\/api\/kanji\/jlpt.*/, // These were causing redirects
  /\/api\/.*achievements.*/, // These were causing redirects
  /https?:\/\/apis\.google\.com\/.*/, // Google API iframe - CORS issues
  /https?:\/\/.*\.googleapis\.com\/.*/, // All Google APIs - CORS issues
  /https?:\/\/.*\.gstatic\.com\/.*/ // Google static content - CORS issues
];

// Install event - minimal caching
self.addEventListener('install', (event) => {
  console.log(`[SW ${SW_VERSION}] Installing...`);
  
  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then(async (cache) => {
        // First, add health check
        await cache.put(
          new Request(CACHE_HEALTH_CHECK_KEY),
          new Response(CACHE_HEALTH_CHECK_VALUE)
        );
        
        // Then cache minimal assets
        const promises = STATIC_ASSETS.map(url => {
          return cache.add(url).catch(err => {
            console.warn(`[SW] Failed to cache ${url}:`, err);
          });
        });
        
        return Promise.all(promises);
      })
      .then(() => {
        console.log(`[SW ${SW_VERSION}] Install complete`);
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up and health check
self.addEventListener('activate', (event) => {
  console.log(`[SW ${SW_VERSION}] Activating...`);
  
  event.waitUntil(
    Promise.all([
      // Clean old caches
      cleanOldCaches(),
      // Perform health check
      performHealthCheck(),
      // Clear redirect tracking
      clearRedirectTracking()
    ])
    .then(() => self.clients.claim())
    .then(() => {
      // Notify all clients about the new service worker
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SERVICE_WORKER_UPDATED',
            version: SW_VERSION
          });
        });
      });
    })
  );
});

// Fetch event - with safety checks
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Check if URL should never be cached
  if (shouldNeverCache(url)) {
    return; // Let browser handle it normally
  }
  
  // Track redirects to prevent loops
  const redirectKey = `${request.url}-${request.mode}`;
  const redirectCount = redirectCounts.get(redirectKey) || 0;
  
  if (redirectCount >= MAX_REDIRECTS) {
    console.error(`[SW] Redirect loop detected for ${request.url}`);
    // Clear the problematic cache entry
    clearCacheForUrl(request.url);
    // Reset counter
    redirectCounts.delete(redirectKey);
    // Return error response
    event.respondWith(
      new Response('Too many redirects detected. Cache cleared. Please refresh.', {
        status: 508,
        statusText: 'Loop Detected'
      })
    );
    return;
  }
  
  // Handle with appropriate strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequestSafely(request, redirectKey));
  } else if (request.destination === 'image') {
    event.respondWith(handleImageRequestSafely(request));
  } else {
    event.respondWith(handleGeneralRequestSafely(request, redirectKey));
  }
});

// Safe API request handler
async function handleApiRequestSafely(request, redirectKey) {
  try {
    // Network first for API calls
    const response = await fetch(request, {
      redirect: 'manual' // Handle redirects manually
    });
    
    // Check for redirect
    if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
      const currentCount = redirectCounts.get(redirectKey) || 0;
      redirectCounts.set(redirectKey, currentCount + 1);
      
      // Follow redirect but track it
      return fetch(request);
    }
    
    // Clear redirect count on success
    redirectCounts.delete(redirectKey);
    
    // Only cache if it's a safe endpoint and successful
    if (response.ok && isSafeToCacheApi(request)) {
      const cache = await caches.open(CACHE_NAMES.api);
      await cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Try cache as fallback
    const cached = await caches.match(request);
    if (cached) {
      console.log(`[SW] Serving API from cache (offline): ${request.url}`);
      return cached;
    }
    
    // Return offline error
    return new Response(
      JSON.stringify({ 
        error: 'Offline',
        message: 'Network unavailable and no cached data'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Safe image request handler
async function handleImageRequestSafely(request) {
  const cache = await caches.open(CACHE_NAMES.images);
  
  // Try cache first for images
  const cached = await cache.match(request);
  if (cached) {
    // Validate cached response
    if (isValidCachedResponse(cached)) {
      return cached;
    } else {
      // Remove corrupted cache entry
      await cache.delete(request);
    }
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return placeholder
    return new Response(
      '<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" fill="#999">Image unavailable</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

// Safe general request handler
async function handleGeneralRequestSafely(request, redirectKey) {
  try {
    // Network first
    const response = await fetch(request, {
      redirect: 'manual'
    });
    
    // Check for redirect
    if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
      const currentCount = redirectCounts.get(redirectKey) || 0;
      redirectCounts.set(redirectKey, currentCount + 1);
      
      // Follow redirect
      return fetch(request);
    }
    
    // Clear redirect count
    redirectCounts.delete(redirectKey);
    
    // Cache successful HTML responses
    if (response.ok && request.headers.get('accept')?.includes('text/html')) {
      const cache = await caches.open(CACHE_NAMES.dynamic);
      await cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Try cache
    const cached = await caches.match(request);
    if (cached && isValidCachedResponse(cached)) {
      return cached;
    }
    
    // Return offline page for navigation
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    return new Response('Network error', { status: 503 });
  }
}

// Helper: Check if URL should never be cached
function shouldNeverCache(url) {
  const pathname = url.pathname;
  return NEVER_CACHE_PATTERNS.some(pattern => pattern.test(pathname));
}

// Helper: Check if API request is safe to cache
function isSafeToCacheApi(request) {
  const url = new URL(request.url);
  return SAFE_CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// Helper: Validate cached response
function isValidCachedResponse(response) {
  // Check if response is not corrupted
  if (!response || !response.headers) {
    return false;
  }
  
  // Check if it's not a redirect
  const status = response.status;
  if (status >= 300 && status < 400) {
    return false;
  }
  
  // Check age (optional - 7 days max)
  const dateHeader = response.headers.get('date');
  if (dateHeader) {
    const age = Date.now() - new Date(dateHeader).getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (age > maxAge) {
      return false;
    }
  }
  
  return true;
}

// Clean old caches
async function cleanOldCaches() {
  const cacheNames = await caches.keys();
  const validCaches = Object.values(CACHE_NAMES);
  
  const deletions = cacheNames
    .filter(name => !validCaches.includes(name))
    .map(name => {
      console.log(`[SW] Deleting old cache: ${name}`);
      return caches.delete(name);
    });
  
  return Promise.all(deletions);
}

// Perform health check
async function performHealthCheck() {
  try {
    const cache = await caches.open(CACHE_NAMES.static);
    const healthResponse = await cache.match(CACHE_HEALTH_CHECK_KEY);
    
    if (!healthResponse) {
      console.warn('[SW] Health check not found - cache might be corrupted');
      await clearAllCaches();
      return;
    }
    
    const healthValue = await healthResponse.text();
    if (healthValue !== CACHE_HEALTH_CHECK_VALUE) {
      console.warn('[SW] Health check mismatch - clearing caches');
      await clearAllCaches();
    } else {
      console.log('[SW] Health check passed');
    }
  } catch (error) {
    console.error('[SW] Health check failed:', error);
    await clearAllCaches();
  }
}

// Clear all caches (nuclear option)
async function clearAllCaches() {
  console.warn('[SW] Clearing all caches due to corruption');
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  
  // Recreate with health check
  const cache = await caches.open(CACHE_NAMES.static);
  await cache.put(
    new Request(CACHE_HEALTH_CHECK_KEY),
    new Response(CACHE_HEALTH_CHECK_VALUE)
  );
}

// Clear cache for specific URL
async function clearCacheForUrl(url) {
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    await cache.delete(url);
  }
}

// Clear redirect tracking
function clearRedirectTracking() {
  redirectCounts.clear();
  return Promise.resolve();
}

// Message handler for recovery
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_ALL_CACHES') {
    event.waitUntil(clearAllCaches());
  }
  
  if (event.data.type === 'HEALTH_CHECK') {
    event.waitUntil(
      performHealthCheck().then(() => {
        event.ports[0].postMessage({ healthy: true });
      })
    );
  }
  
  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: SW_VERSION });
  }
});

// Periodic health check (every 30 minutes)
setInterval(() => {
  performHealthCheck();
}, 30 * 60 * 1000);

console.log(`[SW ${SW_VERSION}] Script loaded`);