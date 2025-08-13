// Custom Service Worker Extensions for Doshi Sensei
// Bundled Workbox - No CDN dependencies

// Version management - change this on deploy to bust caches
const SW_VERSION = 'v2.1.0-stable';

// Import version management
importScripts('/service-worker-update.js');

// next-pwa will inject Workbox here when building
// The workbox global will be available after injection

// Only configure Workbox if it's available
if (typeof workbox !== 'undefined') {
  // Configure Workbox with version
  workbox.core.setCacheNameDetails({ 
    prefix: 'doshi-sensei',
    suffix: SW_VERSION
  });
  
  // Enable immediate activation for critical fixes
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  // Precaching (will be injected by next-pwa)
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

  // Define caching strategies
  const { registerRoute } = workbox.routing;
  const { NetworkFirst, NetworkOnly, CacheFirst, StaleWhileRevalidate } = workbox.strategies;
  const { ExpirationPlugin } = workbox.expiration;
  const { CacheableResponsePlugin } = workbox.cacheableResponse;
  const { BackgroundSyncPlugin } = workbox.backgroundSync;

  // CRITICAL: Handle RSC (React Server Component) requests
  registerRoute(
    ({ url }) => url.searchParams.has('_rsc'),
    new NetworkOnly({
      plugins: [
        new BackgroundSyncPlugin('rsc-queue', {
          maxRetentionTime: 5 * 60 // 5 minutes
        })
      ]
    })
  );

  // Handle Next.js data requests
  registerRoute(
    ({ url }) => url.pathname.includes('/_next/data/'),
    new NetworkFirst({
      cacheName: 'nextjs-data',
      networkTimeoutSeconds: 5,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60 // 5 minutes
        })
      ]
    })
  );

  // Handle problematic pages
  registerRoute(
    ({ url }) => /^\/(vocabulary|drill|practice|news|stories|kanji-browser|admin)\/?$/i.test(url.pathname),
    new NetworkFirst({
      cacheName: 'dynamic-pages',
      networkTimeoutSeconds: 10,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 5 * 60 // 5 minutes
        })
      ]
    })
  );

  // Handle API routes
  registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new NetworkOnly()
  );

  // Handle Stripe
  registerRoute(
    ({ url }) => url.host.includes('stripe.com'),
    new NetworkOnly()
  );

  // Handle audio files
  registerRoute(
    ({ url }) => url.pathname.match(/^\/audio\/.*\.mp3$/i),
    new CacheFirst({
      cacheName: 'audio-cache',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 500,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200]
        })
      ]
    })
  );

  // Handle static data files
  registerRoute(
    ({ url }) => url.pathname.match(/\/data\/.*\.(json|dat)$/i),
    new CacheFirst({
      cacheName: 'static-data',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200]
        })
      ]
    })
  );

  // Homepage - network first with short cache
  registerRoute(
    ({ url }) => url.pathname === '/',
    new NetworkFirst({
      cacheName: 'homepage',
      networkTimeoutSeconds: 3,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 1,
          maxAgeSeconds: 60 * 60 // 1 hour
        })
      ]
    })
  );

  // Admin pages - always fresh
  registerRoute(
    ({ url }) => /^\/admin\/.*/i.test(url.pathname),
    new NetworkFirst({
      cacheName: 'admin-pages',
      networkTimeoutSeconds: 3,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 60 // 1 minute cache for admin pages
        })
      ]
    })
  );

  // Kana audio files - cache permanently
  registerRoute(
    ({ url }) => /^\/audio\/kana\/.*\.mp3$/i.test(url.pathname),
    new CacheFirst({
      cacheName: 'kana-audio-cache',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200]
        })
      ]
    })
  );

  // Handle external media
  registerRoute(
    ({ url }) => url.protocol === 'https:' && /\.(png|jpg|jpeg|svg|gif|webp|mp3|mp4)$/i.test(url.pathname),
    new StaleWhileRevalidate({
      cacheName: 'external-media',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200]
        })
      ]
    })
  );

  // Static CSS files - cache long term
  registerRoute(
    ({ url }) => url.pathname.match(/\.css$/i),
    new StaleWhileRevalidate({
      cacheName: 'static-css',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
        })
      ]
    })
  );

  // JavaScript files - EXCLUDE Next.js chunks to prevent conflicts with Netlify's immutable caching
  // Only cache non-Next.js JavaScript files
  registerRoute(
    ({ url }) => {
      // Skip Next.js static chunks entirely - let Netlify handle them
      if (url.pathname.includes('/_next/static/chunks/') || 
          url.pathname.includes('/_next/static/') ||
          url.pathname.match(/\/_next\/static\/[\w-]+\//)) {
        return false;
      }
      // Only cache other JS files (like third-party scripts)
      return url.pathname.match(/\.js$/i) && !url.pathname.includes('sw.js');
    },
    new NetworkFirst({
      cacheName: 'non-next-js',
      networkTimeoutSeconds: 3,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 // 1 hour only for non-Next.js scripts
        })
      ]
    })
  );

  // Images - cache long term
  registerRoute(
    ({ url }) => /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname),
    new CacheFirst({
      cacheName: 'images',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200]
        })
      ]
    })
  );

  // Fonts - cache forever
  registerRoute(
    ({ url }) => /\.(woff|woff2|ttf|otf)$/i.test(url.pathname),
    new CacheFirst({
      cacheName: 'fonts',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200]
        })
      ]
    })
  );

  // External APIs (excluding Stripe and WaniKani) - cache with validation
  registerRoute(
    ({ url }) => url.origin !== self.location.origin && 
               !url.host.includes('stripe.com') &&
               !url.host.includes('firebaseio.com') &&
               !url.host.includes('googleapis.com') &&
               !url.host.includes('wanikani.com'),  // Never cache WaniKani API
    new StaleWhileRevalidate({
      cacheName: 'external-api',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60 // 5 minutes
        })
      ]
    })
  );
  
  // WaniKani API - always network only, never cache
  registerRoute(
    ({ url }) => url.host.includes('api.wanikani.com'),
    new NetworkOnly()
  );
}

// Custom fetch handling for edge cases
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip service worker for RSC requests - MULTIPLE CHECKS
  if (url.searchParams.has('_rsc') || 
      request.headers.get('RSC') === '1' ||
      request.headers.get('X-Service-Worker-Bypass') === '1' ||
      request.headers.get('accept')?.includes('text/x-component')) {
    return; // Let the browser handle it directly
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
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  }
});