// Optimized caching strategies for PWA

export const CACHE_STRATEGIES = {
  // Static assets - cache first, long TTL
  static: {
    cacheName: 'static-v1',
    routes: [
      '/favicon.ico',
      '/doshi.png',
      '/manifest.json',
      '/flat-icons/**/*',
      '/icons/**/*',
      '/screenshots/**/*'
    ],
    strategy: 'CacheFirst',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    maxEntries: 100
  },

  // Images - cache first with network fallback
  images: {
    cacheName: 'images-v1',
    routes: [
      '/**/*.{png,jpg,jpeg,gif,webp,svg,ico}'
    ],
    strategy: 'CacheFirst',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    maxEntries: 50
  },

  // API responses - network first with cache fallback
  api: {
    cacheName: 'api-v1',
    routes: [
      '/api/**/*'
    ],
    strategy: 'NetworkFirst',
    networkTimeoutSeconds: 3,
    maxAge: 60 * 60, // 1 hour
    maxEntries: 30
  },

  // HTML pages - stale while revalidate
  pages: {
    cacheName: 'pages-v1',
    routes: [
      '/',
      '/drill',
      '/vocabulary',
      '/games',
      '/news',
      '/stories',
      '/account',
      '/settings'
    ],
    strategy: 'StaleWhileRevalidate',
    maxAge: 24 * 60 * 60, // 24 hours
    maxEntries: 20
  },

  // JavaScript and CSS - stale while revalidate with quick updates
  assets: {
    cacheName: 'assets-v1',
    routes: [
      '/_next/static/**/*',
      '/**/*.{js,css}'
    ],
    strategy: 'StaleWhileRevalidate',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    maxEntries: 60
  },

  // Fonts - cache first, very long TTL
  fonts: {
    cacheName: 'fonts-v1',
    routes: [
      '/**/*.{woff,woff2,ttf,otf}'
    ],
    strategy: 'CacheFirst',
    maxAge: 365 * 24 * 60 * 60, // 1 year
    maxEntries: 30
  },

  // External resources - network first with aggressive caching
  external: {
    cacheName: 'external-v1',
    routes: [
      'https://fonts.googleapis.com/**',
      'https://fonts.gstatic.com/**',
      'https://cdn.jsdelivr.net/**'
    ],
    strategy: 'CacheFirst',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    maxEntries: 30
  }
};

// Workbox configuration generator (browser-safe)
export function generateWorkboxConfig() {
  const runtimeCaching = Object.values(CACHE_STRATEGIES).map(strategy => {
    const config: any = {
      urlPattern: strategy.routes.join('|'),
      handler: strategy.strategy as any,
      options: {
        cacheName: strategy.cacheName,
        expiration: {
          maxEntries: strategy.maxEntries,
          maxAgeSeconds: strategy.maxAge
        }
      }
    };

    // Add network timeout for NetworkFirst strategy
    if (strategy.strategy === 'NetworkFirst' && 'networkTimeoutSeconds' in strategy) {
      config.options.networkTimeoutSeconds = strategy.networkTimeoutSeconds;
    }

    // Add cache query options
    config.options.cacheableResponse = {
      statuses: [0, 200]
    };

    return config;
  });

  return {
    runtimeCaching,
    skipWaiting: false,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    precacheAndRoute: true
  };
}

// Cache cleanup utility
export async function cleanupOldCaches() {
  if (!('caches' in window)) return;

  const currentCaches = Object.values(CACHE_STRATEGIES).map(s => s.cacheName);
  const allCaches = await caches.keys();

  // Delete old version caches
  const promises = allCaches
    .filter(cache => !currentCaches.includes(cache))
    .map(cache => caches.delete(cache));

  await Promise.all(promises);
}

// Preload critical resources
export async function preloadCriticalResources() {
  const criticalResources = [
    '/doshi.png',
    '/manifest.json',
    '/_next/static/css/app.css', // Your main CSS
    '/_next/static/chunks/main.js', // Main JS bundle
    '/_next/static/chunks/webpack.js', // Webpack runtime
    '/_next/static/chunks/framework.js', // React framework
    '/_next/static/chunks/pages/_app.js' // App component
  ];

  // Use link prefetch for critical resources
  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = resource;
    link.as = resource.endsWith('.js') ? 'script' : 
               resource.endsWith('.css') ? 'style' : 'image';
    document.head.appendChild(link);
  });
}

// Intelligent cache warming
export async function warmCache() {
  if (!('caches' in window)) return;

  // Warm up frequently accessed routes
  const frequentRoutes = [
    '/',
    '/drill',
    '/vocabulary',
    '/api/user/stats',
    '/api/vocabulary/recent'
  ];

  const cache = await caches.open('pages-v1');
  
  for (const route of frequentRoutes) {
    try {
      const response = await fetch(route);
      if (response.ok) {
        await cache.put(route, response);
      }
    } catch (error) {
      console.log(`Failed to warm cache for ${route}:`, error);
    }
  }
}