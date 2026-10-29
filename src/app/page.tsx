import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getCatalogue, getVehicleIndex } from "@/lib/catalogue-data";
import { groupVehicles } from "@/lib/vehicles";
import { hasPrice, promoPrice } from "@/lib/display";
import { Hero } from "@/components/Hero";
import { BrandStrip, CategoryTiles, HelpCta, StoreSection } from "@/components/HomeSections";
import { ProductSection } from "@/components/ProductSection";
import { SHOP } from "@/lib/shop";

// Les donnees viennent de la synchro AZOUNI AUTO : 5 minutes de cache suffisent. La page n'utilise aucune donnee de la requete : elle est generee une fois puis servie
// depuis le cache (CDN), ce qui la rend instantanee.
export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: `${SHOP.name} – Pièces détachées automobiles à ${SHOP.address.region}` },
  alternates: { canonical: "/" },
};

export default async function Home() {
  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-6xl mx-auto px-4 text-center py-20 text-slate-500">
        <p className="font-semibold mb-2">Site pas encore configure.</p>
        <p className="text-sm">Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (voir README.md).</p>
      </div>
    );
  }

  const [articles, vehicleRows] = await Promise.all([getCatalogue(), getVehicleIndex()]);
  const makes = groupVehicles(vehicleRows);

  const counts: Record<string, number> = {};
  for (const a of articles) counts[a.categorie ?? "autres"] = (counts[a.categorie ?? "autres"] ?? 0) + 1;

  const priced = articles.filter(hasPrice);
  const promos = priced.filter((a) => promoPrice(a) !== null).slice(0, 10);
  const featured = priced.filter((a) => a.en_vedette).slice(0, 10);
  // pas encore de selection faite dans l'application : on met en avant des pieces qui ont une photo
  const selection = featured.length > 0 ? featured : priced.filter((a) => a.photo_url).slice(0, 10);

  return (
    <>
      <Hero articleCount={articles.length} makes={makes} />
      <BrandStrip makes={makes} />
      <CategoryTiles counts={counts} />
      <ProductSection tone="dark" eyebrow="Prix en baisse" title="Promos du comptoir" articles={promos} moreHref="/catalogue?promo=1" moreLabel="Toutes les promos" />
      <ProductSection
        eyebrow="Du comptoir à votre garage"
        title={featured.length > 0 ? "Sélection du comptoir" : "En rayon maintenant"}
        articles={selection}
        moreHref="/catalogue"
        moreLabel="Voir toutes les pièces"
      />
      <HelpCta />
      <StoreSection />
    </>
  );
}
