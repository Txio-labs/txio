import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'export',
  reactStrictMode: true,
  turbopack: {
    root: path.join(import.meta.dirname, ".."),
  },
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
