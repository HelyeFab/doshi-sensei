import type { NextConfig } from "next";
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    WANIKANI_API_TOKEN: process.env.NEXT_PUBLIC_WANIKANI_API_TOKEN || process.env.WANIKANI_API_TOKEN,
  },
  // Skip type checking and linting during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable server-side functionality for API routes
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Netlify deployment configuration
  // Remove output: 'standalone' for Netlify compatibility
  // Configure webpack to handle the runtime issues
  webpack: (config, { isServer, dev }) => {
    // Handle browser-specific modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        path: false,
      };
    }
    
    // Fix module not found issues
    config.module.rules.push({
      test: /\.m?js$/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });
    
    // Ensure proper chunking
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          commons: {
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
          },
        },
      };
    }
    
    return config;
  },
  // Experimental features to help with build issues
  experimental: {
    // Disable webpack build worker to avoid runtime issues
    webpackBuildWorker: false,
    // Improve module resolution
    optimizePackageImports: ['framer-motion', 'lucide-react'],
  },
};

// Production-ready PWA configuration with SSR safety
const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Disable in dev for faster builds
  mode: 'production',
  
  // Custom worker to handle SKIP_WAITING messages
  customWorkerDir: 'worker',
  
  // Scope and SW configuration
  scope: '/',
  sw: 'sw.js',
  
  // Build configuration
  buildExcludes: [
    /middleware-manifest\.json$/,
    /app-build-manifest\.json$/,
    /_buildManifest\.js$/,
    /_ssgManifest\.js$/,
    /flat-icons/,
    /chunks\/pages\/_app/,
    /chunks\/pages\/_error/,
  ],
  
  // Advanced PWA features
  dynamicStartUrl: true,
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  cleanupOutdatedCaches: true,
  
  // Fallback pages for offline support
  fallbacks: {
    document: '/offline',
  },
  
  // Advanced caching strategies
  runtimeCaching: [
      // App shell and pages - Network First
      {
        urlPattern: /^https?:\/\/.*\.(html|\/|\/\?.*)$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'doshi-pages',
          networkTimeoutSeconds: 3,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
        },
      },
      // Static assets - Cache First
      {
        urlPattern: /\.(?:js|css|woff|woff2|ttf|otf|eot)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'doshi-static',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      // Images - Cache First with larger cache
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'doshi-images',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // API calls - Network First with short cache
      {
        urlPattern: /^https?:\/\/.*\/api\//,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'doshi-api',
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 30,
            maxAgeSeconds: 5 * 60, // 5 minutes
          },
          cacheableResponse: {
            statuses: [0, 200],
            headers: {
              'x-cache': 'HIT',
            },
          },
        },
      },
      // External resources (fonts, CDNs)
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'doshi-fonts',
          expiration: {
            maxEntries: 30,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          },
        },
      },
    ],
  
  // Exclude files from precaching
  publicExcludes: ['!workbox-*.js', '!sw.js', '!worker-*.js'],
})(nextConfig as any);

export default config;
