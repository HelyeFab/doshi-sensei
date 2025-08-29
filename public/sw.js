/**
 * Doshi Sensei PWA Service Worker - Improved Version
 * Balanced caching strategy that prioritizes freshness for app code
 * while still providing offline functionality
 */

// Polyfill for TextEncoder/TextDecoder if not available in service worker context
if (typeof TextEncoder === 'undefined') {
  self.TextEncoder = class TextEncoder {
    encode(str) {
      const utf8 = unescape(encodeURIComponent(str));
      const result = new Uint8Array(utf8.length);
      for (let i = 0; i < utf8.length; i++) {
        result[i] = utf8.charCodeAt(i);
      }
      return result;
    }
  };
}

if (typeof TextDecoder === 'undefined') {
  self.TextDecoder = class TextDecoder {
    decode(bytes) {
      let result = '';
      for (let i = 0; i < bytes.length; i++) {
        result += String.fromCharCode(bytes[i]);
      }
      return decodeURIComponent(escape(result));
    }
  };
}

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

// Configuration - INCREMENT THIS ON EACH DEPLOYMENT
const SW_VERSION = '5.1.0-red-panda-' + new Date().getTime(); // Force red panda icon update
const APP_NAME = 'doshi-sensei';
const DEBUG = false;

// Debug logging wrapper
const debugLog = (...args) => {
  if (DEBUG) console.log('[SW]', ...args);
};

// Initialize Workbox
if (workbox) {
  workbox.setConfig({ debug: DEBUG });
  
  workbox.core.setCacheNameDetails({
    prefix: APP_NAME,
    suffix: `v${SW_VERSION}`
  });

  // Skip waiting and claim clients immediately
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  // Precache essential pages only
  workbox.precaching.precacheAndRoute([
    { url: '/', revision: SW_VERSION },
    { url: '/offline', revision: SW_VERSION },
    { url: '/splash.html', revision: SW_VERSION },
    { url: '/doshi.png', revision: SW_VERSION }
  ]);

  // ===== CRITICAL CHANGE: Next.js app code - Network First =====
  // This ensures users always get the latest code when online
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/_next/'),
    new workbox.strategies.NetworkFirst({
      cacheName: `${APP_NAME}-app-code`,
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 60 * 60, // Only 1 hour cache for app code
          purgeOnQuotaError: true
        })
      ]
    })
  );

  // Navigation requests - Network First with quick timeout
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: `${APP_NAME}-pages`,
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 60 * 60, // 1 hour cache for pages
          purgeOnQuotaError: true
        })
      ]
    })
  );

  // Static assets (images, fonts, etc) - Cache First is OK here
  workbox.routing.registerRoute(
    ({ url, request }) => {
      const isStaticAsset = 
        request.destination === 'image' ||
        request.destination === 'font' ||
        url.pathname.startsWith('/icons/') ||
        url.pathname.startsWith('/sounds/') ||
        url.pathname.startsWith('/fonts/') ||
        url.pathname.startsWith('/splash/');
      
      return url.origin === self.location.origin && isStaticAsset;
    },
    new workbox.strategies.CacheFirst({
      cacheName: `${APP_NAME}-static-assets`,
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days for truly static assets
          purgeOnQuotaError: true
        })
      ]
    })
  );

  // API calls - Network First with very short cache
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkFirst({
      cacheName: `${APP_NAME}-api`,
      networkTimeoutSeconds: 5,
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // Only 5 minutes for API responses
          purgeOnQuotaError: true
        })
      ]
    })
  );

  // Google Fonts - Cache First (these rarely change)
  workbox.routing.registerRoute(
    ({ url }) => 
      url.origin === 'https://fonts.googleapis.com' || 
      url.origin === 'https://fonts.gstatic.com',
    new workbox.strategies.CacheFirst({
      cacheName: `${APP_NAME}-google-fonts`,
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        })
      ]
    })
  );

  // Offline fallback for navigation - DISABLE preload to prevent errors
  // workbox.navigationPreload.enable(); // DISABLED - causes cancelled request errors
  
  const navigationHandler = async (params) => {
    try {
      // Don't use preloadResponse to avoid cancelled request errors
      
      // Fallback to NetworkFirst strategy
      return await new workbox.strategies.NetworkFirst({
        cacheName: `${APP_NAME}-pages`,
        plugins: [
          new workbox.expiration.ExpirationPlugin({
            maxEntries: 20,
            maxAgeSeconds: 60 * 60
          })
        ]
      }).handle(params);
    } catch (error) {
      // Return offline page or fallback response
      return caches.match('/offline') || new Response('Offline', { status: 503 });
    }
  };

  workbox.routing.registerRoute(
    new workbox.routing.NavigationRoute(navigationHandler)
  );
}

// Install event - always skip waiting
self.addEventListener('install', (event) => {
  debugLog('Installing version', SW_VERSION);
  self.skipWaiting();
});

// Activate event - aggressive cache cleanup
self.addEventListener('activate', (event) => {
  debugLog('Activating version', SW_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Delete ALL old version caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete any cache that doesn't match current version
              return cacheName.includes(APP_NAME) && 
                     !cacheName.includes(`v${SW_VERSION}`);
            })
            .map((cacheName) => {
              debugLog('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Claim all clients immediately
      clients.claim()
    ])
  );
});

// Message handler
self.addEventListener('message', async (event) => {
  const { type } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_ALL_CACHES':
      // Nuclear option - clear everything
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      // Reload all clients
      const clients = await self.clients.matchAll();
      clients.forEach(client => client.navigate(client.url));
      break;
      
    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: SW_VERSION });
      break;
  }
});

// Periodic cache cleanup (runs every hour when SW is active)
setInterval(async () => {
  const cacheNames = await caches.keys();
  const now = Date.now();
  
  for (const cacheName of cacheNames) {
    if (!cacheName.includes(`v${SW_VERSION}`)) {
      await caches.delete(cacheName);
    }
  }
}, 60 * 60 * 1000); // Every hour