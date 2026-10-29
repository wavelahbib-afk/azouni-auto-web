import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { hasPromotions } from "@/lib/catalogue-data";
import { SHOP, siteUrl } from "@/lib/shop";

// Texte courant : Barlow ; titres, prix et chiffres : Barlow Condensed (capitales condensees, esprit signalisation d'atelier) ; references : IBM Plex Mono.
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-cond",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SHOP.name} – Pièces détachées automobiles à ${SHOP.address.region}`, template: `%s | ${SHOP.name}` },
  description: `${SHOP.name}, ${SHOP.address.city} (${SHOP.address.region}) : pièces de rechange automobile en stock, catalogue en ligne par référence et par véhicule, commande par WhatsApp, livraison possible.`,
  icons: { icon: "/logo.png" },
  openGraph: { siteName: SHOP.name, locale: "fr_TN", type: "website", images: ["/logo.png"] },
  alternates: { canonical: "/" },
};

// Donnees structurees "magasin de pieces auto" (Google : fiche locale, adresse, telephone).
const storeJsonLd = {
  "@context": "https://schema.org",
  "@type": "AutoPartsStore",
  name: SHOP.name,
  url: siteUrl(),
  image: `${siteUrl()}/logo.png`,
  telephone: SHOP.phoneHref.replace("tel:", ""),
  address: {
    "@type": "PostalAddress",
    streetAddress: SHOP.address.street,
    addressLocality: SHOP.address.city,
    addressRegion: SHOP.address.region,
    addressCountry: "TN",
  },
  ...(SHOP.hours ? { openingHours: SHOP.hours } : {}),
  currenciesAccepted: "TND",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const promos = await hasPromotions();
  return (
    <html
      lang="fr"
      className={`${barlow.variable} ${barlowCondensed.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd).replace(/</g, "\u003c") }} />
        <Header hasPromos={promos} />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
        <WhatsAppFloat />
      </body>
    </html>
  );
}
