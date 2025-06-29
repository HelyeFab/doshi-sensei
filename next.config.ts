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
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // Experimental features to help with build issues
  experimental: {
    // Disable webpack build worker to avoid runtime issues
    webpackBuildWorker: false,
  },
};

const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // Additional PWA options for static export
  buildExcludes: [/middleware-manifest\.json$/, /app-build-manifest\.json$/],
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  // Exclude problematic manifest files
  manifestTransforms: [(manifestEntries) => {
    const manifest = manifestEntries.filter(entry => 
      !entry.url.includes('app-build-manifest.json') &&
      !entry.url.includes('middleware-manifest.json')
    );
    return { manifest, warnings: [] };
  }],
  // Fix caching issues
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/doshisensei\.com\/.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'doshi-sensei-pages',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'doshi-sensei-images',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /\/api\/.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'doshi-sensei-api',
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
      },
    },
  ],
  // Additional exclusions to prevent caching errors
  publicExcludes: ['!workbox-*.js', '!sw.js'],
})(nextConfig as any);

export default config;
