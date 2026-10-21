import { supabaseRestAll, fetchEquivalencesByCode, isSupabaseConfigured } from "@/lib/supabase";
import type { CatalogArticle } from "@/lib/types";
import { normalizeReference } from "@/lib/normalize";
import { Catalogue } from "@/components/Catalogue";
import { Hero } from "@/components/Hero";
import { FeaturesBar } from "@/components/FeaturesBar";

// Les donnees viennent de la synchro AZOUNI AUTO (toutes les ~20 min par
// defaut) : pas besoin de refetch a chaque visite, 5 minutes de cache suffit.
export const revalidate = 300;

async function getArticles(): Promise<CatalogArticle[]> {
  // select=* (et non une liste de colonnes) : le site continue de fonctionner meme si la base n'a pas encore les colonnes designation_correcte / vehicules_compatibles.
  const [data, equivByCode] = await Promise.all([
    supabaseRestAll("articles_catalogue?select=*&order=designation", revalidate),
    fetchEquivalencesByCode(revalidate),
  ]);
  // Seul ce que le catalogue affiche ou cherche part vers le navigateur (pas l'emplacement de rayon, ni la date de mise a jour) ; les references
  // d'origine (92 000 lignes) ne partent que sous forme d'index de recherche compact.
  return (data as CatalogArticle[]).map((a) => ({
    code: a.code,
    reference: a.reference,
    designation: a.designation,
    designation_correcte: a.designation_correcte ?? null,
    vehicules_compatibles: a.vehicules_compatibles ?? null,
    marque: a.marque,
    famille: a.famille,
    sous_famille: a.sous_famille,
    prix_vente_ttc: a.prix_vente_ttc,
    stock_qty: a.stock_qty,
    photo_url: a.photo_url,
    refsIndex: [a.reference ?? "", a.code, ...(equivByCode.get(a.code) ?? [])].map(normalizeReference).join("|"),
  })) as CatalogArticle[];
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const articles = await getArticles();
  const params = await searchParams;
  const initialQuery = typeof params.q === "string" ? params.q : "";

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-6xl mx-auto px-4 text-center py-20 text-slate-500">
        <p className="font-semibold mb-2">Site pas encore configure.</p>
        <p className="text-sm">Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (voir README.md).</p>
      </div>
    );
  }

  return (
    <>
      <Hero articleCount={articles.length} />
      <FeaturesBar />
      <div id="catalogue" className="max-w-6xl mx-auto px-4 py-10 scroll-mt-20">
        <h2 className="text-xl font-extrabold text-slate-900 mb-5">Notre catalogue</h2>
        {articles.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="font-semibold mb-2">Catalogue vide pour le moment.</p>
            <p className="text-sm">Lancez une synchronisation depuis AZOUNI AUTO (Parametres &gt; Synchronisation site web).</p>
          </div>
        ) : (
          <Catalogue articles={articles} initialQuery={initialQuery} />
        )}
      </div>
    </>
  );
}
