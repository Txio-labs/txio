import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download the desktop app — Txio",
  description: 'Download the native Txio desktop app for Linux, macOS and Windows. It updates itself.',
  alternates: { canonical: "/download" },
  openGraph: { title: "Download the desktop app — Txio", description: 'Download the native Txio desktop app for Linux, macOS and Windows. It updates itself.', url: "/download" },
};

export default function DownloadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
