import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  reactStrictMode: true,
  transpilePackages: ['@mysten/dapp-kit', '@mysten/sui'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
