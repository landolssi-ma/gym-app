import type { MetadataRoute } from "next"

import { getCms, getSeo } from "@/lib/cms"
import { STATIC_PUBLIC_PATHS } from "@/lib/public-paths"

// Changelog entries have no page of their own; /changelog lists them.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getCms().getArticles()
  return getSeo().buildSitemap([...STATIC_PUBLIC_PATHS, ...articles.map((a) => `/blog/${a.slug}`)])
}
