import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    WANIKANI_API_TOKEN: process.env.NEXT_PUBLIC_WANIKANI_API_TOKEN,
  },
  // Configure for Netlify deployment with functions
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Ensure static files are accessible
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
};

export default nextConfig;
