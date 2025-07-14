import type { NextConfig } from "next";
import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^\/admin\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'admin-pages',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 // 1 minute cache for admin pages
        }
      }
    },
    {
      urlPattern: /^\/api\/admin\/.*/i,
      handler: 'NetworkOnly' // Never cache admin API calls
    }
  ],
  buildExcludes: [/middleware-manifest\.json$/]
});

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    WANIKANI_API_TOKEN: process.env.NEXT_PUBLIC_WANIKANI_API_TOKEN || process.env.WANIKANI_API_TOKEN,
    // Make Firebase env vars available to server-side code
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL,
    FIREBASE_CLIENT_ID: process.env.FIREBASE_CLIENT_ID || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_ID,
    FIREBASE_PRIVATE_KEY_ID: process.env.FIREBASE_PRIVATE_KEY_ID || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY_ID,
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
    
    // Reduce file watching load in development
    if (dev && !isServer) {
      config.watchOptions = {
        ignored: [
          '**/.git/**',
          '**/node_modules/**',
          '**/.next/**',
          '**/dist/**',
          '**/build/**',
          '**/coverage/**',
          '**/.vscode/**',
          '**/.idea/**',
        ],
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

export default pwaConfig(nextConfig);
