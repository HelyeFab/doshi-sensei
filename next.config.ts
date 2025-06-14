import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    WANIKANI_API_TOKEN: process.env.NEXT_PUBLIC_WANIKANI_API_TOKEN,
  },
  // Configure for static export (Netlify compatibility)
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
