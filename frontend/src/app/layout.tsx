import type { Metadata } from "next";
// System fonts used for build stability
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = { variable: "--font-inter" };
const spaceGrotesk = { variable: "--font-space-grotesk" };
const jetbrainsMono = { variable: "--font-jetbrains-mono" };

export const metadata: Metadata = {
  title: "txio | Universal Web3 IDE",
  description: "Universal Web3 IDE for the Sui ecosystem and beyond.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased dot-grid`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
