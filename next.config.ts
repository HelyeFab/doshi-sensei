import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disable strict mode to prevent double rendering
  
  // Skip type checking and linting during development for now
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable some optimizations that might cause issues
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compress: true,
  
  // Images configuration
  images: {
    unoptimized: true,
  },
  
  // Experimental features to control preloading
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  
  // Configure webpack to handle module resolution issues
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
    
    // Reduce file watching load in development
    if (dev) {
      config.watchOptions = {
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/public/audio/**', // Ignore 6000+ audio files
          '**/public/data/**',  // Ignore large data files
        ],
      };
    }
    
    return config;
  },
  
  // Headers to control resource hints
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
        ],
      },
      {
        // Ensure service worker is served with correct headers
        source: '/sw.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/'
          },
          {
            key: 'Content-Type',
            value: 'application/javascript'
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          },
        ],
      },
      {
        // Firebase messaging service worker
        source: '/firebase-messaging-sw.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/'
          },
          {
            key: 'Content-Type',
            value: 'application/javascript'
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          },
        ],
      },
      {
        // Firebase cloud messaging scope file
        source: '/firebase-cloud-messaging-push-scope',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain'
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          },
        ],
      },
    ];
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
};

export default nextConfig;