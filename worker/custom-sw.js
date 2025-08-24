// Production-Ready Service Worker for Doshi Sensei
// Version 3.0.0 - Bulletproof with automatic recovery
// This is the ONLY service worker - all others have been removed

const SW_VERSION = "v3.0.0-production";
const APP_SHELL_CACHE = `app-shell-${SW_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${SW_VERSION}`;

// Critical URLs that should never be cached or intercepted by SW
const BYPASS_URLS = [
  "stripe.com",
  "stripe.network",
  "googleapis.com",
  "gstatic.com",
  "firebaseio.com",
  "firebaseapp.com",
  "api.wanikani.com",
];

// Clean up old caches on activation
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete ALL caches that don't match current version
              return !cacheName.includes(SW_VERSION);
            })
            .map((cacheName) => {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log("[SW] Version", SW_VERSION, "activated");
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Handle skip waiting for updates
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[SW] Skip waiting triggered");
    self.skipWaiting();
  }

  // Handle cache cleanup requests
  if (event.data && event.data.type === "CLEAN_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => !name.includes(SW_VERSION))
            .map((name) => caches.delete(name))
        );
      })
    );
  }
});

// Configure Workbox (injected by next-pwa during build)
if (typeof workbox !== "undefined") {
  // Set cache name details
  workbox.core.setCacheNameDetails({
    prefix: "doshi",
    suffix: SW_VERSION,
    precache: "precache",
    runtime: "runtime",
  });

  // Skip waiting and claim clients immediately
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  // Precache manifest (injected by next-pwa)
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

  // Import strategies
  const { registerRoute } = workbox.routing;
  const { NetworkFirst, NetworkOnly, CacheFirst, StaleWhileRevalidate } =
    workbox.strategies;
  const { ExpirationPlugin } = workbox.expiration;
  const { CacheableResponsePlugin } = workbox.cacheableResponse;

  // CRITICAL: Network-only for all payment and auth services
  registerRoute(
    ({ url }) => BYPASS_URLS.some((domain) => url.host.includes(domain)),
    new NetworkOnly(),
    "GET"
  );

  // API routes - Network first with timeout
  registerRoute(
    ({ url }) => url.pathname.startsWith("/api/"),
    new NetworkFirst({
      cacheName: "api-cache",
      networkTimeoutSeconds: 5,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
    "GET"
  );

  // Next.js data requests - Network first
  registerRoute(
    ({ url }) => url.pathname.includes("/_next/data/"),
    new NetworkFirst({
      cacheName: "nextjs-data",
      networkTimeoutSeconds: 3,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 60 * 60, // 1 hour
        }),
      ],
    }),
    "GET"
  );

  // CSS files - Ensure proper MIME type handling
  registerRoute(
    ({ url }) => /\.css$/.test(url.pathname),
    new StaleWhileRevalidate({
      cacheName: "css-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200],
          headers: {
            "Content-Type": "text/css",
          },
        }),
        {
          // Ensure CSS files are served with correct MIME type
          cacheWillUpdate: async ({ response }) => {
            if (response && response.status === 200) {
              const contentType = response.headers.get("content-type");
              if (!contentType || !contentType.includes("text/css")) {
                // Create new response with correct MIME type
                const body = await response.blob();
                return new Response(body, {
                  status: response.status,
                  statusText: response.statusText,
                  headers: {
                    ...Object.fromEntries(response.headers.entries()),
                    "Content-Type": "text/css; charset=utf-8",
                  },
                });
              }
            }
            return response;
          },
        },
      ],
    }),
    "GET"
  );

  // JavaScript files - Ensure proper MIME type handling
  registerRoute(
    ({ url }) => /\.js$/.test(url.pathname),
    new StaleWhileRevalidate({
      cacheName: "js-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200],
          headers: {
            "Content-Type": "application/javascript",
          },
        }),
        {
          // Ensure JS files are served with correct MIME type
          cacheWillUpdate: async ({ response }) => {
            if (response && response.status === 200) {
              const contentType = response.headers.get("content-type");
              if (!contentType || !contentType.includes("javascript")) {
                // Create new response with correct MIME type
                const body = await response.blob();
                return new Response(body, {
                  status: response.status,
                  statusText: response.statusText,
                  headers: {
                    ...Object.fromEntries(response.headers.entries()),
                    "Content-Type": "application/javascript; charset=utf-8",
                  },
                });
              }
            }
            return response;
          },
        },
      ],
    }),
    "GET"
  );

  // Images - Cache first
  registerRoute(
    ({ url }) => /\.(png|jpg|jpeg|svg|gif|webp|ico)$/.test(url.pathname),
    new CacheFirst({
      cacheName: "images",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
    "GET"
  );

  // Audio files - Cache first with large cache
  registerRoute(
    ({ url }) => /\.mp3$/.test(url.pathname),
    new CacheFirst({
      cacheName: "audio",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 500,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
    "GET"
  );

  // Fonts - Cache forever
  registerRoute(
    ({ url }) => /\.(woff|woff2|ttf|otf)$/.test(url.pathname),
    new CacheFirst({
      cacheName: "fonts",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        }),
      ],
    }),
    "GET"
  );

  // HTML pages - Network first
  registerRoute(
    ({ request }) => request.mode === "navigate",
    new NetworkFirst({
      cacheName: "pages",
      networkTimeoutSeconds: 5,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        }),
      ],
    }),
    "GET"
  );
}

// Custom fetch handler for edge cases
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // CRITICAL: Bypass SW completely for payment/auth services
  if (BYPASS_URLS.some((domain) => url.host.includes(domain))) {
    return; // Let browser handle directly
  }

  // Bypass SW for Next.js hot reload in development
  if (
    url.pathname.includes("_next/webpack-hmr") ||
    url.pathname.includes("__nextjs")
  ) {
    return;
  }

  // Bypass SW for RSC requests
  if (
    url.searchParams.has("_rsc") ||
    request.headers.get("RSC") === "1" ||
    request.headers.get("accept")?.includes("text/x-component")
  ) {
    return;
  }

  // Handle navigation errors with offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match("/offline").then((response) => {
          if (response) return response;

          // Return a basic offline page if not cached
          return new Response(
            `<!DOCTYPE html>
            <html>
              <head>
                <title>Offline - Doshi Sensei</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { 
                    font-family: system-ui, sans-serif; 
                    text-align: center; 
                    padding: 50px 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                  }
                  h1 { font-size: 2em; margin-bottom: 20px; }
                  p { font-size: 1.2em; opacity: 0.9; }
                  button {
                    margin-top: 30px;
                    padding: 12px 24px;
                    font-size: 1em;
                    background: white;
                    color: #667eea;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                  }
                </style>
              </head>
              <body>
                <h1>You're Offline</h1>
                <p>Please check your internet connection and try again.</p>
                <button onclick="location.reload()">Retry</button>
              </body>
            </html>`,
            {
              status: 200,
              headers: { "Content-Type": "text/html" },
            }
          );
        });
      })
    );
  }
});

// Health check endpoint
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "HEALTH_CHECK") {
    event.ports[0].postMessage({
      version: SW_VERSION,
      status: "healthy",
      caches: caches.keys(),
    });
  }
});

console.log("[SW] Service Worker v3.0.0 loaded - Production Ready");