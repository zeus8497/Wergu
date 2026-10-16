import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaBootstrap } from "./install-app";

export const metadata: Metadata = {
  title: "Saliou THIAW · Évolution",
  description: "L’application personnelle de Saliou THIAW : course, entraînement, nutrition, sommeil, évolution et finances.",
  applicationName: "Saliou Évolution",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Saliou Évolution" },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c1318" },
    { media: "(prefers-color-scheme: light)", color: "#f2f4ed" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased"><PwaBootstrap />{children}</body>
    </html>
  );
}
