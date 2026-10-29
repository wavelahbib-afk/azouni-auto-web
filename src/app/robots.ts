import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/shop";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/panier", "/commande/"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
