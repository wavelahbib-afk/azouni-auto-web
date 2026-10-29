import type { MetadataRoute } from "next";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getCatalogue } from "@/lib/catalogue-data";
import { CATEGORIES } from "@/lib/categories";
import { siteUrl } from "@/lib/shop";

// Regenere au plus toutes les heures : les nouveaux articles en stock y apparaissent sans redeploiement.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/catalogue`, changeFrequency: "daily", priority: 0.9 },
    ...CATEGORIES.map((c) => ({ url: `${base}/catalogue?categorie=${c.slug}`, changeFrequency: "daily" as const, priority: 0.7 })),
    { url: `${base}/livraison-paiement`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
  ];
  if (!isSupabaseConfigured) return pages;

  const articles = await getCatalogue();
  return [
    ...pages,
    ...articles.map((a) => ({
      url: `${base}/article/${encodeURIComponent(a.code)}`,
      lastModified: a.updated_at ? new Date(a.updated_at) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
