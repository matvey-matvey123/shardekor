import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const host = new URL("https://шардекор.рф").origin;
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${host}/sitemap.xml`,
    host,
  };
}