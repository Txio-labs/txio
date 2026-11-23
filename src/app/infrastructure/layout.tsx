import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Infrastructure — Txio",
  description: 'How Txio reaches chain RPC endpoints: failover to the next backup on 429 or 5xx, per-chain latency checks, private RPC URLs, and one core shared by the web app, desktop and CLI.',
  alternates: { canonical: "/infrastructure" },
  openGraph: { title: "Infrastructure — Txio", description: 'How Txio reaches chain RPC endpoints: failover to the next backup on 429 or 5xx, per-chain latency checks, private RPC URLs, and one core shared by the web app, desktop and CLI.', url: "/infrastructure" },
};

export default function InfrastructureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
