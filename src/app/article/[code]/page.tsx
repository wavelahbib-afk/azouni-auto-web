import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { supabaseRest } from "@/lib/supabase";
import type { CatalogArticle } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { ArticleImage } from "@/components/ArticleImage";
import { AddToCartButton } from "@/components/AddToCartButton";

export const revalidate = 300;

async function getArticle(code: string): Promise<CatalogArticle | null> {
  const [data, equivRows] = await Promise.all([
    supabaseRest(`articles_catalogue?select=*&code=eq.${encodeURIComponent(code)}&limit=1`, revalidate) as Promise<CatalogArticle[] | null>,
    supabaseRest(`article_equivalences_catalogue?select=equivalent_reference&code=eq.${encodeURIComponent(code)}`, revalidate) as Promise<
      { equivalent_reference: string }[] | null
    >,
  ]);
  if (!data || data.length === 0) return null;
  return { ...data[0], equivalences: (equivRows ?? []).map((r) => r.equivalent_reference) };
}

export default async function ArticlePage({ params }: PageProps<"/article/[code]">) {
  const { code } = await params;
  const article = await getArticle(decodeURIComponent(code));
  if (!article) notFound();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6">
        <Link href="/" className="hover:text-brand transition-colors">
          Catalogue
        </Link>
        <ChevronRight size={12} />
        {article.famille && (
          <>
            <span>{article.famille}</span>
            <ChevronRight size={12} />
          </>
        )}
        <span className="text-slate-600 truncate">{article.designation}</span>
      </nav>

      <div className="grid sm:grid-cols-2 gap-10">
        <ArticleImage photoUrl={article.photo_url} alt={article.designation} className="w-full aspect-square rounded-2xl border border-slate-200" />
        <div>
          {article.marque && <span className="text-xs font-semibold text-brand uppercase tracking-wide">{article.marque}</span>}
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1 mb-3">{article.designation}</h1>

          <div className="flex items-center gap-2 mb-5">
            {article.stock_qty > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                <CheckCircle2 size={13} />
                En stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-full">
                <XCircle size={13} />
                Rupture de stock
              </span>
            )}
          </div>

          <dl className="text-sm text-slate-600 mb-5 space-y-1.5">
            {article.reference && (
              <div>
                <dt className="inline font-medium text-slate-700">Référence : </dt>
                <dd className="inline font-mono">{article.reference}</dd>
              </div>
            )}
            {article.famille && (
              <div>
                <dt className="inline font-medium text-slate-700">Famille : </dt>
                <dd className="inline">
                  {article.famille}
                  {article.sous_famille ? ` / ${article.sous_famille}` : ""}
                </dd>
              </div>
            )}
          </dl>

          <p className="text-3xl font-extrabold text-brand mb-6">{formatMoney(article.prix_vente_ttc)}</p>
          <AddToCartButton article={article} />

          {article.equivalences && article.equivalences.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h2 className="text-sm font-semibold text-slate-700 mb-2.5">Références équivalentes / d&apos;origine</h2>
              <div className="flex flex-wrap gap-2">
                {article.equivalences.map((ref) => (
                  <span key={ref} className="text-xs font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                    {ref}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
