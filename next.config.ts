import type { NextConfig } from "next";
import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  reloadOnOnline: false,
  publicExcludes: [
    '!robots.txt', 
    '!sitemap.xml',
    '!data/**/*',
    '!audio/**/*',
    '!flat-icons/**/*',
    '!**/*.mp3',
    '!**/*.svg',
    '!**/*.json',
    '!**/*.dat',
    '!**/*.gz'
  ],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
  exclude: [
    // Exclude all audio files
    ({ asset }) => asset.name.endsWith('.mp3'),
    ({ asset }) => asset.name.endsWith('.wav'),
    ({ asset }) => asset.name.endsWith('.ogg'),
    // Exclude all data files
    ({ asset }) => asset.name.includes('/data/'),
    ({ asset }) => asset.name.includes('/audio/'),
    ({ asset }) => asset.name.includes('/flat-icons/'),
    ({ asset }) => asset.name.endsWith('.json'),
    ({ asset }) => asset.name.endsWith('.dat'),
    ({ asset }) => asset.name.endsWith('.gz'),
    ({ asset }) => asset.name.endsWith('.svg'),
    // Exclude external resources
    ({ asset }) => asset.name.includes('githubusercontent'),
    ({ asset }) => asset.name.includes('watanoc'),
    // Exclude large files
    ({ asset }) => asset.name.includes('jmdict'),
    ({ asset }) => asset.name.includes('kanjidb'),
    ({ asset }) => asset.name.includes('tts-sentences'),
    // Exclude build artifacts
    ({ asset }) => asset.name.includes('_next/static/chunks/'),
    ({ asset }) => asset.name.includes('_next/static/css/'),
    ({ asset }) => asset.name.includes('_next/static/media/'),
    // Exclude pages
    ({ asset }) => asset.name === 'index.html',
    ({ asset }) => asset.name === '/',
    // Exclude any file larger than 500KB
    ({ asset }) => asset.size > 500 * 1024,
  ],
  buildExcludes: [
    /middleware-manifest\.json$/,
    /app-path-routes-manifest\.json$/,
    /react-loadable-manifest\.json$/,
    /build-manifest\.json$/,
    /_buildManifest\.js$/,
    /_ssgManifest\.js$/,
    /pages-manifest\.json$/,
    /\/data\//,
    /\/audio\//,
    /\/flat-icons\//,
    /\.mp3$/,
    /\.svg$/,
    /\.dat$/,
    /\.gz$/
  ],
  customWorkerDir: 'worker',
  swSrc: 'worker/custom-sw.js'
});

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  },
  process.env.NODE_ENV === 'development' 
    ? {
        key: 'Content-Security-Policy',
        value: "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
      }
    : {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com https://www.youtube.com https://s.ytimg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https: http: https://raw.githubusercontent.com https://watanoc.com https://lh3.googleusercontent.com https://*.googleusercontent.com; media-src 'self' blob: https: https://watanoc.com; connect-src 'self' https://api.stripe.com https://apis.google.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com wss://*.firebaseio.com https://*.firebaseio.com https://www.youtube.com https://youtube.com https://raw.githubusercontent.com https://watanoc.com https://lh3.googleusercontent.com https://*.googleusercontent.com; frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://*.firebaseapp.com https://doshi-sensei.firebaseapp.com https://www.youtube.com https://youtube.com; frame-ancestors 'none';"
      }
];

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    WANIKANI_API_TOKEN: process.env.NEXT_PUBLIC_WANIKANI_API_TOKEN || process.env.WANIKANI_API_TOKEN,
    // Make Firebase env vars available to server-side code (remove NEXT_PUBLIC_ fallbacks)
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_CLIENT_ID: process.env.FIREBASE_CLIENT_ID,
    FIREBASE_PRIVATE_KEY_ID: process.env.FIREBASE_PRIVATE_KEY_ID,
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // CORS headers for API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGIN || 'https://doshisensei.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
  // Skip type checking and linting during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Add async rewrites to handle YouTube player requests
  async rewrites() {
    return [
      {
        source: '/tools/youtube-shadowing/youtube-player/:path*',
        destination: 'https://www.youtube.com/:path*',
      },
    ];
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
        buffer: require.resolve('buffer/'),
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
          // Static assets (23,000+ files)
          '**/public/data/**',      // 7,159 KanjiVG SVG files
          '**/public/audio/**',     // 6,733 audio files
          '**/flat-icons/**',       // 2,343 icon files
          // Build artifacts
          '**/.netlify/**',         // Netlify build artifacts
          '**/netlify/functions/**', // Netlify functions
          // Test files
          '**/__tests__/**',        // Test directories
          '**/*.test.*',            // Test files
          '**/*.spec.*',            // Spec files
          // Other directories
          '**/scripts/**',          // Script files
          '**/.claude/**',          // Claude artifacts
          '**/.kiro/**',            // Kiro artifacts
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
    
    // Add support for WASM files (for anki-reader)
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
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
