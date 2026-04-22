import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Providers } from "../components/layout/providers";

export const metadata: Metadata = {
  title: "MPSTME Canteen Pay",
  description: "Order ahead, pay fast, collect smart.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/mpstme-logo.png",
    apple: "/mpstme-logo.png"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MPSTME Canteen"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020617"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
