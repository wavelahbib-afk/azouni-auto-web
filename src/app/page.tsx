import { supabaseRestAll, fetchEquivalencesByCode, isSupabaseConfigured } from "@/lib/supabase";
import type { CatalogArticle } from "@/lib/types";
import { Catalogue } from "@/components/Catalogue";

// Les donnees viennent de la synchro AZOUNI AUTO (toutes les ~20 min par
// defaut) : pas besoin de refetch a chaque visite, 5 minutes de cache suffit.
export const revalidate = 300;

async function getArticles(): Promise<CatalogArticle[]> {
  const [data, equivByCode] = await Promise.all([
    supabaseRestAll("articles_catalogue?select=*&order=designation", revalidate),
    fetchEquivalencesByCode(revalidate),
  ]);
  return (data as CatalogArticle[]).map((a) => ({ ...a, equivalences: equivByCode.get(a.code) ?? [] }));
}

export default async function Home() {
  const articles = await getArticles();

  if (!isSupabaseConfigured) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p className="font-semibold mb-2">Site pas encore configure.</p>
        <p className="text-sm">Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (voir README.md).</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p className="font-semibold mb-2">Catalogue vide pour le moment.</p>
        <p className="text-sm">Lancez une synchronisation depuis AZOUNI AUTO (Parametres &gt; Synchronisation site web).</p>
      </div>
    );
  }

  return <Catalogue articles={articles} />;
}
