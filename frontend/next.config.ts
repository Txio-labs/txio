import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'export',
  reactStrictMode: true,
  transpilePackages: [
    '@mysten/dapp-kit',
    '@mysten/sui',
    'wagmi',
    '@wagmi/connectors',
    '@wagmi/core',
    '@stellar/freighter-api',
    '@lobstrco/signer-extension-api'
  ],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
