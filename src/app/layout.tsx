import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// next/font downloads Inter at build time and serves it from our own domain (CSP font-src 'self').
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "PrivateConnet",
  description: "Private, vetted connections in Liberia.",
  robots: { index: false, follow: false }, // members-only service; keep it out of search engines
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans text-body">{children}</body>
    </html>
  );
}
