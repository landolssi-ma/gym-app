import { revalidateTag } from "next/cache"
import { z } from "zod"
import { createBasehubSource } from "./basehub"
import { ArticleSchema, ChangelogEntrySchema, LegalDocumentSchema } from "./schemas"
import type { Article, ChangelogEntry, LegalDocument, LegalDocumentKind } from "./types"

export const CmsConfigSchema = z.object({
  provider: z.literal("basehub"),
  apiKey: z.string().min(1),
  apiUrl: z.url(),
})
export type CmsConfig = z.input<typeof CmsConfigSchema>

// Max staleness per content type, in seconds; each type is cached under the tag `cms:<type>`.
export const CMS_REVALIDATE = {
  articles: 3600,
  changelog: 3600,
  legal: 86400,
} as const
export type CmsContentType = keyof typeof CMS_REVALIDATE

const cache = (type: CmsContentType) => ({ tags: [`cms:${type}`], revalidate: CMS_REVALIDATE[type] })

// By-slug lookups filter the cached list: one request and one cache entry per type.
const bySlug = <T extends { slug: string }>(items: T[], slug: string) => items.find((i) => i.slug === slug) ?? null

export function createCms(config: CmsConfig) {
  const source = createBasehubSource(CmsConfigSchema.parse(config))
  const cms = {
    getArticles: async (): Promise<Article[]> => z.array(ArticleSchema).parse(await source.articles(cache("articles"))),
    getArticleBySlug: async (slug: string) => bySlug(await cms.getArticles(), slug),
    getLegalDocument: async (kind: LegalDocumentKind): Promise<LegalDocument | null> =>
      z.array(LegalDocumentSchema).parse(await source.legalDocuments(cache("legal"))).find((d) => d.kind === kind) ?? null,
    getChangelogEntries: async (): Promise<ChangelogEntry[]> =>
      z.array(ChangelogEntrySchema).parse(await source.changelogEntries(cache("changelog"))),
  }
  return cms
}
export type Cms = ReturnType<typeof createCms>

// Drops a type's cached content now; `expire: 0` makes the next query refetch instead of
// serving stale. Server Functions / Route Handlers only.
export function invalidate(type: CmsContentType) {
  revalidateTag(`cms:${type}`, { expire: 0 })
}
