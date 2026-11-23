import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs — Txio",
  description: 'Documentation for the Txio CLI (txio), the public execution API, and running the full stack locally with Docker.',
  alternates: { canonical: "/docs" },
  openGraph: { title: "Docs — Txio", description: 'Documentation for the Txio CLI (txio), the public execution API, and running the full stack locally with Docker.', url: "/docs" },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
