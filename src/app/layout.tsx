import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://rentalaja.co.id"),
  title: { default: "Rentalaja · Sewa motor, iPhone, kamera, dan penginapan di Garut", template: "%s · Rentalaja" },
  description: "Sewa motor, mobil, iPhone, kamera, perlengkapan camping, penginapan, dan trip Jeep di Garut dan Bandung. Cek ketersediaan dan booking langsung.",
};

export const viewport: Viewport = { themeColor: "#1F2B4D", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
