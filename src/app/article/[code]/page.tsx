import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle, Car, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import { supabaseRest } from "@/lib/supabase";
import { getCatalogue } from "@/lib/catalogue-data";
import type { CatalogArticle } from "@/lib/types";
import { formatDt, formatMoney } from "@/lib/format";
import { articleRef, articleTitle, articleVehicles, effectivePrice, hasCorrectedTitle, hasPrice, promoPercent, promoPrice, rawDesignation } from "@/lib/display";
import { articleCategory, categoryBySlug } from "@/lib/categories";
import { buildArticleQuestionMessage, buildWhatsAppLink } from "@/lib/whatsapp";
import { DELIVERY, SHOP, siteUrl } from "@/lib/shop";
import { ArticleImage } from "@/components/ArticleImage";
import { ArticleCard } from "@/components/ArticleCard";
import { AddToCartButton } from "@/components/AddToCartButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CopyButton } from "@/components/CopyButton";
import { OriginRefsSection, SpecsSection, VehiclesSection, type SpecRow, type VehicleGroup } from "@/components/ArticleSections";

import { Eyebrow } from "@/components/Eyebrow";
export const revalidate = 300;

const shopName = SHOP.name;
const shopWhatsapp = SHOP.whatsapp;

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
    hasPrice(article) ? `${formatMoney(effectivePrice(article))} TTC.` : "",
    `En stock chez ${shopName} (${SHOP.address.region}), livraison possible.`,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    title: `${title}${article.marque ? ` ${article.marque}` : ""} – Réf. ${ref}`,
    description,
    alternates: { canonical: `/article/${encodeURIComponent(article.code)}` },
    openGraph: { title: `${title} – ${shopName}`, description, type: "website", images: article.photo_url ? [article.photo_url] : undefined },
  };
}

/** Pieces proches de celle-ci : meme categorie, de preference la meme marque ; en stock et avec un prix. */
async function getRelated(article: CatalogArticle, categorySlug: string): Promise<CatalogArticle[]> {
  const all = await getCatalogue();
  const candidates = all.filter((a) => a.code !== article.code && a.categorie === categorySlug && a.stock_qty > 0 && hasPrice(a));
  const sameBrand = article.marque ? candidates.filter((a) => a.marque === article.marque) : [];
  const others = candidates.filter((a) => !sameBrand.includes(a));
  // le catalogue est trie par designation : une tranche autour de la piece donne des voisines de meme nature, sans hasard (page generee une fois, mise en cache)
  const start = Math.max(0, others.findIndex((a) => a.designation.localeCompare(article.designation, "fr") >= 0) - 2);
  return [...sameBrand.slice(0, 4), ...others.slice(start, start + 4)].slice(0, 4);
}

export default async function ArticlePage({ params }: PageProps<"/article/[code]">) {
  const { code } = await params;
  const article = await getArticle(decodeURIComponent(code));
  if (!article) notFound();

  const title = articleTitle(article);
  const vehicles = articleVehicles(article);
  const ref = articleRef(article);
  const priced = hasPrice(article);
  const promo = promoPrice(article);
  const percent = promoPercent(article);
  const categorySlug = articleCategory(article);
  const category = categoryBySlug(categorySlug);
  const related = await getRelated(article, categorySlug);
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
      url: `${siteUrl()}/article/${encodeURIComponent(article.code)}`,
      priceCurrency: "TND",
      ...(priced ? { price: effectivePrice(article).toFixed(3) } : {}),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  const crumbs = [
    { label: "Accueil", href: "/" },
    { label: "Catalogue", href: "/catalogue" },
    ...(category ? [{ label: category.label, href: `/catalogue?categorie=${category.slug}` }] : []),
    { label: title },
  ];
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${siteUrl()}${c.href}` } : {}),
    })),
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }} />

      <Breadcrumbs items={crumbs} className="mb-6" />

      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-8 lg:gap-12">
        <div>
          <div className="lg:sticky lg:top-40 relative">
            <ArticleImage photoUrl={article.photo_url} alt={title} className="w-full aspect-square rounded-2xl border border-slate-200" />
            {percent !== null && <span className="chamfer-sm absolute top-0 left-0 bg-amber-400 text-ink font-display font-extrabold text-2xl leading-none pl-3.5 pr-5 py-2.5">−{percent}%</span>}
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
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded">
                <CheckCircle2 size={13} />
                En stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded">
                <XCircle size={13} />
                Rupture de stock
              </span>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            {priced ? (
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={`font-display text-5xl sm:text-6xl font-extrabold leading-none ${promo !== null ? "text-red-600" : "text-ink"}`}>{formatMoney(effectivePrice(article))}</span>
                <span className="text-sm font-semibold text-slate-400">TTC</span>
                {promo !== null && <span className="text-lg text-slate-400 line-through">{formatMoney(article.prix_vente_ttc)}</span>}
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
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded font-display font-bold text-[15px] tracking-[0.1em] uppercase transition-colors ${
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
                <Truck size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                <span>
                  Livraison {formatDt(DELIVERY.fee)}, gratuite dès {DELIVERY.freeFrom} DT d&apos;achat, ou retrait gratuit au magasin. Paiement à la réception.{" "}
                  <Link href="/livraison-paiement" className="font-semibold text-brand hover:underline">
                    En savoir plus
                  </Link>
                </span>
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

      {related.length > 0 && (
        <section className="mt-14" aria-labelledby="related-title">
          <Eyebrow className="mb-1.5">{category?.label ?? "Catalogue"}</Eyebrow>
          <h2 id="related-title" className="text-2xl font-extrabold text-slate-900 tracking-tight mb-5">
            Dans la même catégorie
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {related.map((a) => (
              <ArticleCard key={a.code} article={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
