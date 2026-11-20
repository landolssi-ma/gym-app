// The OG image renderer is the separate "@workspace/seo/og" entry, so pages that only need
// structured data never load its font or the image renderer.
export { createSeo, SeoConfigSchema } from "./seo"
export type { ArticleJsonLdInput, Crumb, FaqItem, Offer, Seo, SeoConfig } from "./seo"
