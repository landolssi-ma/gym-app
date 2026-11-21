import type { MetadataRoute } from "next"
import { z } from "zod"

export const SeoConfigSchema = z.object({
  origin: z.url(),
  siteName: z.string().min(1),
})
export type SeoConfig = z.input<typeof SeoConfigSchema>

export type ArticleJsonLdInput = {
  path: string
  title: string
  description: string
  image: string
  datePublished?: string
  dateModified?: string
}
export type FaqItem = { question: string; answer: string }
export type Crumb = { name: string; path: string }

// JSON-LD builders return plain schema.org objects; callers serialize them into a
// <script type="application/ld+json"> tag.
export function createSeo(config: SeoConfig) {
  const { origin, siteName } = SeoConfigSchema.parse(config)
  const url = (path: string) => new URL(path, origin).toString()
  const organization = { "@type": "Organization", name: siteName, url: url("/") } as const

  return {
    buildBlogPostingJsonLd: (a: ArticleJsonLdInput) => ({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: a.title,
      description: a.description,
      image: url(a.image),
      url: url(a.path),
      mainEntityOfPage: url(a.path),
      ...(a.datePublished && { datePublished: a.datePublished }),
      ...(a.dateModified && { dateModified: a.dateModified }),
      author: organization,
      publisher: organization,
    }),
    buildFaqPageJsonLd: (questions: readonly FaqItem[]) => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: questions.map((q) => ({
        "@type": "Question",
        name: q.question,
        acceptedAnswer: { "@type": "Answer", text: q.answer },
      })),
    }),
    buildOrganizationJsonLd: () => ({ "@context": "https://schema.org", ...organization }),
    buildWebsiteJsonLd: () => ({ "@context": "https://schema.org", "@type": "WebSite", name: siteName, url: url("/") }),
    buildBreadcrumbListJsonLd: (crumbs: readonly Crumb[]) => ({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: url(c.path) })),
    }),
    // Content-source agnostic: the caller supplies every path (static routes + CMS slugs).
    buildSitemap: (paths: readonly string[]): MetadataRoute.Sitemap => paths.map((p) => ({ url: url(p) })),
  }
}
export type Seo = ReturnType<typeof createSeo>
