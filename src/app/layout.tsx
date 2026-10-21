import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "AZOUNI AUTO";

export const metadata: Metadata = {
  title: { default: `${shopName} – Pièces détachées automobiles`, template: `%s | ${shopName}` },
  description: `${shopName} - Pièces de rechange automobile en stock, catalogue en ligne et commande par WhatsApp`,
  icons: { icon: "/logo.png" },
  openGraph: { siteName: shopName, locale: "fr_TN", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
