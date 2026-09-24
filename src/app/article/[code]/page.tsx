import { notFound } from "next/navigation";
import { supabaseRest } from "@/lib/supabase";
import type { CatalogArticle } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { ArticlePlaceholderIcon } from "@/components/ArticlePlaceholderIcon";
import { AddToCartButton } from "@/components/AddToCartButton";

export const revalidate = 300;

async function getArticle(code: string): Promise<CatalogArticle | null> {
  const data = (await supabaseRest(`articles_catalogue?select=*&code=eq.${encodeURIComponent(code)}&limit=1`, revalidate)) as CatalogArticle[] | null;
  return data && data.length > 0 ? data[0] : null;
}

export default async function ArticlePage({ params }: PageProps<"/article/[code]">) {
  const { code } = await params;
  const article = await getArticle(decodeURIComponent(code));
  if (!article) notFound();

  return (
    <div className="grid sm:grid-cols-2 gap-8">
      <ArticlePlaceholderIcon famille={article.famille} className="w-full aspect-square rounded-xl" />
      <div>
        <h1 className="text-xl font-bold text-slate-800 mb-1">{article.designation}</h1>
        {article.marque && <p className="text-slate-500 mb-4">{article.marque}</p>}
        <dl className="text-sm text-slate-600 mb-4 space-y-1">
          {article.reference && (
            <div>
              <dt className="inline font-medium text-slate-700">Reference : </dt>
              <dd className="inline">{article.reference}</dd>
            </div>
          )}
          {article.famille && (
            <div>
              <dt className="inline font-medium text-slate-700">Famille : </dt>
              <dd className="inline">{article.famille}{article.sous_famille ? ` / ${article.sous_famille}` : ""}</dd>
            </div>
          )}
        </dl>
        <p className="text-2xl font-bold text-blue-900 mb-6">{formatMoney(article.prix_vente_ttc)}</p>
        <AddToCartButton article={article} />
      </div>
    </div>
  );
}
