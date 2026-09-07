import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import { PwaUpdater } from "@/components/PwaUpdater";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-fraunces" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "Dabo",
  description: "L'équilibre du foyer, enfin visible.",
  manifest: "/manifest.json?v=2",
  icons: {
    icon: [
      { url: "/dabo-equilibre-v2.svg", type: "image/svg+xml" },
      { url: "/dabo-equilibre-v2-192.png", sizes: "192x192", type: "image/png" },
      { url: "/dabo-equilibre-v2-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dabo",
  },
};

export const viewport: Viewport = {
  themeColor: "#22301F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} font-sans bg-[#E7E3D8] text-ink`}>
        <PwaUpdater />
        {children}
      </body>
    </html>
  );
}
