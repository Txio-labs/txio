import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features — Txio",
  description: 'Requests that understand the chain: method autocomplete, parameter templates, per-chain transaction builders, cURL import and endpoint failover across Sui, EVM, Solana, Aptos and Stellar.',
  alternates: { canonical: "/features" },
  openGraph: { title: "Features — Txio", description: 'Requests that understand the chain: method autocomplete, parameter templates, per-chain transaction builders, cURL import and endpoint failover across Sui, EVM, Solana, Aptos and Stellar.', url: "/features" },
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
