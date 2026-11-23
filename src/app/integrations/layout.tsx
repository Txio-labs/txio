import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chain integrations — Txio",
  description: 'What works on each chain today: JSON-RPC, contract calls, transaction builders, name resolution, and the known gaps, listed as gaps.',
  alternates: { canonical: "/integrations" },
  openGraph: { title: "Chain integrations — Txio", description: 'What works on each chain today: JSON-RPC, contract calls, transaction builders, name resolution, and the known gaps, listed as gaps.', url: "/integrations" },
};

export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
