import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const c = getCatalog();
  const { products, staticPages } = c;
  const base = new URL("https://шардекор.рф").origin;
  const now = new Date();
  const allCats = Object.values(c.categoryBySlug);

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/catalog/`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/contacts/`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    ...staticPages.map((p) => ({
      url: base + p.url,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...allCats.map((c) => ({
      url: `${base}/catalog/${c.slug}/`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${base}/product/${p.slug}/`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}