import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

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
  title: shopName,
  description: `${shopName} - Pieces de rechange automobile, catalogue en ligne`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
