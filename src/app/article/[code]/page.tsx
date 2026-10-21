import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, CheckCircle2, XCircle, Car, MessageCircle, ShieldCheck, Wallet } from "lucide-react";
import { supabaseRest } from "@/lib/supabase";
import type { CatalogArticle } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { articleRef, articleTitle, articleVehicles, hasCorrectedTitle, hasPrice, rawDesignation } from "@/lib/display";
import { buildArticleQuestionMessage, buildWhatsAppLink } from "@/lib/whatsapp";
import { ArticleImage } from "@/components/ArticleImage";
import { AddToCartButton } from "@/components/AddToCartButton";
import { CopyButton } from "@/components/CopyButton";
import { OriginRefsSection, SpecsSection, VehiclesSection, type SpecRow, type VehicleGroup } from "@/components/ArticleSections";

export const revalidate = 300;

const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "AZOUNI AUTO";
const shopWhatsapp = process.env.NEXT_PUBLIC_SHOP_WHATSAPP || "";

// cache() : la page et generateMetadata lisent le meme article sans refaire les 3 requetes.
const getArticle = cache(async (code: string): Promise<CatalogArticle | null> => {
  const [data, equivRows, vehicleRows] = await Promise.all([
    supabaseRest(`articles_catalogue?select=*&code=eq.${encodeURIComponent(code)}&limit=1`, revalidate) as Promise<CatalogArticle[] | null>,
    supabaseRest(`article_equivalences_catalogue?select=equivalent_reference&code=eq.${encodeURIComponent(code)}`, revalidate) as Promise<
      { equivalent_reference: string }[] | null
    >,
    supabaseRest(`article_vehicle_compat_catalogue?select=make,model&code=eq.${encodeURIComponent(code)}`, revalidate) as Promise<
      { make: string; model: string }[] | null
    >,
  ]);
  if (!data || data.length === 0) return null;
  const vehicleCompat = new Map<string, Set<string>>();
  for (const r of vehicleRows ?? []) {
    const models = vehicleCompat.get(r.make);
    if (models) models.add(r.model);
    else vehicleCompat.set(r.make, new Set([r.model]));
  }
  return {
    ...data[0],
    equivalences: Array.from(new Set((equivRows ?? []).map((r) => r.equivalent_reference))),
    vehicleCompat: Array.from(vehicleCompat, ([make, models]) => ({ make, models: Array.from(models) })),
  };
});

export async function generateMetadata({ params }: PageProps<"/article/[code]">): Promise<Metadata> {
  const { code } = await params;
  const article = await getArticle(decodeURIComponent(code));
  if (!article) return { title: "Article introuvable" };
  const title = articleTitle(article);
  const vehicles = articleVehicles(article);
  const ref = articleRef(article);
  const description = [
    `${title}${article.marque ? ` ${article.marque}` : ""}, réf. ${ref}.`,
    vehicles ? `Pour ${vehicles}.` : "",
    hasPrice(article) ? `${formatMoney(article.prix_vente_ttc)} TTC.` : "",
    `En stock chez ${shopName}, commande simple par WhatsApp.`,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    title: `${title}${article.marque ? ` ${article.marque}` : ""} – Réf. ${ref}`,
    description,
    openGraph: { title: `${title} – ${shopName}`, description, type: "website", images: article.photo_url ? [article.photo_url] : undefined },
  };
}

export default async function ArticlePage({ params }: PageProps<"/article/[code]">) {
  const { code } = await params;
  const article = await getArticle(decodeURIComponent(code));
  if (!article) notFound();

  const title = articleTitle(article);
  const vehicles = articleVehicles(article);
  const ref = articleRef(article);
  const priced = hasPrice(article);
  const inStock = article.stock_qty > 0;
  const raw = rawDesignation(article);
  const vehicleGroups: VehicleGroup[] = article.vehicleCompat ?? [];
  const equivalences = article.equivalences ?? [];
  const questionLink = shopWhatsapp ? buildWhatsAppLink(shopWhatsapp, buildArticleQuestionMessage(shopName, title, ref, article.marque)) : "";

  const specs = ([
    { label: "Désignation", value: title },
    article.marque ? { label: "Marque", value: article.marque } : null,
    { label: "Référence", value: ref, mono: true },
    article.code !== ref ? { label: "Code article", value: article.code, mono: true } : null,
    article.famille ? { label: "Famille", value: article.sous_famille ? `${article.famille} / ${article.sous_famille}` : article.famille } : null,
    // la designation d'origine n'est utile que si elle apporte quelque chose de plus que le titre affiche
    hasCorrectedTitle(article) && raw ? { label: "Désignation d'origine", value: raw } : null,
    { label: "Disponibilité", value: inStock ? "En stock" : "Rupture de stock" },
  ] as (SpecRow | null)[]).filter((r): r is SpecRow => r !== null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    sku: article.code,
    mpn: ref,
    ...(article.marque ? { brand: { "@type": "Brand", name: article.marque } } : {}),
    ...(article.photo_url ? { image: article.photo_url } : {}),
    description: vehicles ? `${title} pour ${vehicles}` : title,
    offers: {
      "@type": "Offer",
      priceCurrency: "TND",
      ...(priced ? { price: article.prix_vente_ttc.toFixed(3) } : {}),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 mb-6">
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
        <span className="text-slate-600 truncate max-w-[60vw]" aria-current="page">
          {title}
        </span>
      </nav>

      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-8 lg:gap-12">
        <div>
          <div className="lg:sticky lg:top-24">
            <ArticleImage photoUrl={article.photo_url} alt={title} className="w-full aspect-square rounded-2xl border border-slate-200" />
          </div>
        </div>

        <div>
          {article.marque && (
            <span className="inline-block text-[11px] font-bold text-brand uppercase tracking-wider bg-brand-soft px-2.5 py-1 rounded-md">{article.marque}</span>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight mt-3">{title}</h1>

          {vehicles && (
            <p className="mt-2.5 flex items-start gap-2 text-slate-500">
              <Car size={18} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span>
                <span className="font-medium text-slate-600">Véhicules : </span>
                {vehicles}
              </span>
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              Réf.
              <span className="font-mono font-semibold text-slate-800">{ref}</span>
              <CopyButton text={ref} label="Copier la référence" />
            </span>
            {inStock ? (
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

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            {priced ? (
              <p className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-brand">{formatMoney(article.prix_vente_ttc)}</span>
                <span className="text-sm font-semibold text-slate-400">TTC</span>
              </p>
            ) : (
              <p className="text-2xl font-extrabold text-slate-700">Prix sur demande</p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {priced && inStock && <AddToCartButton article={article} />}
              {questionLink && (
                <a
                  href={questionLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-colors ${
                    priced && inStock
                      ? "border border-green-600 text-green-700 hover:bg-green-50"
                      : "bg-green-600 text-white hover:bg-green-700 shadow-sm"
                  }`}
                >
                  <MessageCircle size={16} />
                  {priced && inStock ? "Poser une question" : "Demander le prix sur WhatsApp"}
                </a>
              )}
            </div>

            <ul className="mt-5 pt-5 border-t border-slate-100 space-y-2.5 text-sm text-slate-500">
              <li className="flex items-start gap-2.5">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                Prix et disponibilité confirmés par le magasin avant toute commande.
              </li>
              <li className="flex items-start gap-2.5">
                <Wallet size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                Aucun paiement en ligne : vous réglez au magasin.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-6">
        <SpecsSection rows={specs} />
        {(vehicles || vehicleGroups.length > 0) && <VehiclesSection cited={vehicles} groups={vehicleGroups} />}
        {equivalences.length > 0 && <OriginRefsSection refs={equivalences} />}
      </div>
    </div>
  );
}
