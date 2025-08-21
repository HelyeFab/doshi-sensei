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
};

export default nextConfig;