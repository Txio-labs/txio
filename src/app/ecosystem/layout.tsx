import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Supported chains — Txio",
  description: 'The chains Txio supports: Sui, Ethereum and EVM mainnets, Solana, Aptos and Stellar with Soroban. Also how the web app, desktop, CLI and API fit together.',
  alternates: { canonical: "/ecosystem" },
  openGraph: { title: "Supported chains — Txio", description: 'The chains Txio supports: Sui, Ethereum and EVM mainnets, Solana, Aptos and Stellar with Soroban. Also how the web app, desktop, CLI and API fit together.', url: "/ecosystem" },
};

export default function EcosystemLayout({ children }: { children: React.ReactNode }) {
  return children;
}
