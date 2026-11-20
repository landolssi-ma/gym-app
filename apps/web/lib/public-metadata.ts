import type { Metadata } from "next"

import { site } from "@/config/site"

// Title, description, canonical URL and link preview tags for a public page; relative URLs
// resolve against the root layout's metadataBase (APP_ORIGIN). The preview image comes from the
// route's opengraph-image.tsx.
export function publicMetadata(path: string, title: string, description: string, article = false): Metadata {
  return {
    title: `${title} · ${site.name}`,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: article ? "article" : "website",
      siteName: site.name,
    },
    twitter: { card: "summary_large_image", title, description },
  }
}
