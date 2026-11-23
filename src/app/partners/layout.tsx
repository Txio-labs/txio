import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partners and providers — Txio",
  description: 'The swap, bridge, wallet, history and RPC providers Txio uses. Providers supply quotes and orders; you review and sign them.',
  alternates: { canonical: "/partners" },
  openGraph: { title: "Partners and providers — Txio", description: 'The swap, bridge, wallet, history and RPC providers Txio uses. Providers supply quotes and orders; you review and sign them.', url: "/partners" },
};

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
