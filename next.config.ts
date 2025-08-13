import type { NextConfig } from "next";
import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true, // Changed to true for immediate updates
  reloadOnOnline: false,
  mode: 'production',
  fallbacks: {
    document: '/offline'
  },
  publicExcludes: [
    '!robots.txt',
    '!sitemap.xml',
    '!data/**/*',
    '!audio/**/*',
    '!flat-icons/**/*'
  ],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
  buildExcludes: [
    /workbox-.*\.js$/,
    /_buildManifest\.js$/,
    /_ssgManifest\.js$/
  ],
  dynamicStartUrl: false, // Disable dynamic start URL
  // Use custom worker with InjectManifest
  swSrc: 'worker/custom-sw.js',
  swDest: 'public/sw.js'
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
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com https://www.youtube.com https://s.ytimg.com; script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com https://www.youtube.com https://s.ytimg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https: http: https://raw.githubusercontent.com https://watanoc.com https://lh3.googleusercontent.com https://*.googleusercontent.com https://*.stripe.com https://i.vimeo.com https://www.google.com; media-src 'self' blob: https: https://watanoc.com; connect-src 'self' https://api.stripe.com https://js.stripe.com https://*.stripe.com https://basil.stripe.js https://basil.stripe.com wss://checkout.stripe.com https://apis.google.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.googleapis.com https://firestore.googleapis.com https://firebaseio.com https://*.firebaseio.com wss://*.firebaseio.com https://www.youtube.com https://youtube.com https://raw.githubusercontent.com https://raw.githubusercontent.com https://watanoc.com https://lh3.googleusercontent.com https://*.googleusercontent.com https://api.wanikani.com https://i.vimeo.com https://www.google.com; frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://*.firebaseapp.com https://doshi-sensei.firebaseapp.com https://www.youtube.com https://youtube.com; frame-ancestors 'none';"
      }
];

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // Disable strict mode to prevent double rendering
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
  // Optimize production builds
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compress: true,
  // Add async rewrites to handle YouTube player requests
  async rewrites() {
    return [
      {
        source: '/tools/youtube-shadowing/youtube-player/:path*',
        destination: 'https://www.youtube.com/:path*',
      },
    ];
  },
  // Compiler options - remove console in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error'], // Keep console.error for critical errors
    } : false,
  },
  // Enable server-side functionality for API routes
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
    
    // Only optimize in production
    if (!dev) {
      const TerserPlugin = require('terser-webpack-plugin');
      
      config.optimization = config.optimization || {};
      config.optimization.minimize = true;
      config.optimization.minimizer = config.optimization.minimizer || [];
      
      // Remove any existing TerserPlugin instances
      config.optimization.minimizer = config.optimization.minimizer.filter(
        (plugin) => !(plugin instanceof TerserPlugin || plugin.constructor.name === 'TerserPlugin')
      );
      
      // Add our TerserPlugin with aggressive console removal
      config.optimization.minimizer.push(
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true, // Remove ALL console statements
              drop_debugger: true, // Remove debugger statements
              pure_funcs: [
                'console.log', 
                'console.info', 
                'console.debug', 
                'console.warn',
                'console.error',
                'console.trace',
                'console.group',
                'console.groupEnd',
                'console.groupCollapsed',
                'console.table',
                'console.time',
                'console.timeEnd',
                'console.assert',
                'console.count',
                'console.countReset',
                'console.dir',
                'console.dirxml',
                'console.profile',
                'console.profileEnd',
                'console.timeLog',
                'console.timeStamp',
                'console.clear'
              ],
              passes: 2, // Multiple passes for better optimization
              dead_code: true,
              evaluate: true,
              if_return: true,
              inline: true,
              join_vars: true,
              reduce_vars: true,
              loops: true,
              toplevel: false,
              warnings: false,
            },
            mangle: {
              safari10: false, // Disable Safari 10 workarounds for Chrome compatibility
            },
            format: {
              comments: false, // Remove all comments
              ascii_only: true, // Escape Unicode characters
            },
          },
          extractComments: false,
          parallel: true,
        })
      );
    }
    
    
    // Reduce file watching load in development
    if (dev) {
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
          // Windows system files - using patterns that work cross-platform
          '**/DumpStack.log.tmp',
          '**/hiberfil.sys',
          '**/pagefile.sys',
          '**/swapfile.sys',
          '**/$Recycle.Bin/**',
          '**/System Volume Information/**',
          '**/Windows/**',
          '**/Program Files/**',
          '**/Program Files (x86)/**',
          '**/ProgramData/**',
          // Root level system files
          '/DumpStack.log.tmp',
          '/hiberfil.sys',
          '/pagefile.sys',
          '/swapfile.sys',
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
    
    // Optimize chunking for production with Netlify-compatible settings
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 200000, // Reduced from 244000 for better Chrome compatibility
        cacheGroups: {
          // Framework chunks - keep stable
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            name: 'framework',
            priority: 40,
            enforce: true,
            reuseExistingChunk: true,
          },
          // Common libraries used across the app
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name(module, chunks, cacheGroupKey) {
              // Create stable names for vendor chunks
              const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)?.[1];
              return `lib-${packageName?.replace('@', '').replace('/', '-') || 'vendor'}`;
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          // Shared code between pages
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
            reuseExistingChunk: true,
          },
          // Default fallback
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      };
      
      // Use deterministic module ids for stable chunks
      config.optimization.moduleIds = 'deterministic';
      config.optimization.runtimeChunk = 'single';
      
      // Ensure proper chunk loading for Chrome
      config.output = {
        ...config.output,
        crossOriginLoading: 'anonymous', // Help with CORS issues
        chunkLoadTimeout: 60000, // Increase timeout for slow connections
      };
    }
    
    return config;
  },
  // Experimental features - removed webpackBuildWorker to fix build
  experimental: {
    // Improve module resolution
    optimizePackageImports: ['framer-motion', 'lucide-react'],
  },
};

export default pwaConfig(nextConfig);
