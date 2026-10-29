import type { Metadata } from "next";
import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getCatalogue, getVehicleIndex } from "@/lib/catalogue-data";
import { groupVehicles } from "@/lib/vehicles";
import { Catalogue } from "@/components/Catalogue";
import { SHOP } from "@/lib/shop";

// Les donnees viennent de la synchro AZOUNI AUTO : 5 minutes de cache suffisent. Les filtres (categorie, marque, vehicule, prix...) sont appliques dans le navigateur
// a partir de l'adresse (?categorie=freinage...) : la page reste statique, donc servie instantanement depuis le cache.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Catalogue des pièces",
  description: `Toutes les pièces auto en stock chez ${SHOP.name} (${SHOP.address.region}) : recherche par référence, par véhicule, par catégorie et par marque.`,
  alternates: { canonical: "/catalogue" },
};

export default async function CataloguePage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-6xl mx-auto px-4 text-center py-20 text-slate-500">
        <p className="font-semibold mb-2">Site pas encore configure.</p>
        <p className="text-sm">Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (voir README.md).</p>
      </div>
    );
  }

  const [articles, vehicleRows] = await Promise.all([getCatalogue(), getVehicleIndex()]);

  // useSearchParams (lecture des filtres dans l'adresse) exige une frontiere Suspense pour que la page puisse rester statique.
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400 text-sm">Chargement du catalogue…</div>}>
      <Catalogue articles={articles} makes={groupVehicles(vehicleRows)} />
    </Suspense>
  );
}
