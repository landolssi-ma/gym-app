import type { Article, ChangelogEntry, Cms, LegalDocument } from "@workspace/cms"
import { createSeo } from "@workspace/seo"

const article = (slug: string, title: string, category: string): Article => ({
  slug,
  title,
  description: `${title}: a short summary.`,
  category,
  image: { src: `https://assets.test/${slug}.jpg`, alt: title, width: 1440, height: 810 },
  intro: `Why ${title.toLowerCase()} matters.`,
  sections: [
    { id: "first", heading: `${title}, part one`, paragraphs: ["The first idea."] },
    { id: "second", heading: `${title}, part two`, paragraphs: ["The second idea."], bullets: ["A point", "Another point"] },
  ],
  sources: [{ label: "A source", href: "https://example.com/source" }],
})

// What the Cms API returns, in the shapes packages/cms parses the provider's content into.
export const CMS = {
  articles: [article("getting-started", "Getting started", "Guides"), article("inviting-your-team", "Inviting your team", "Teams"), article("choosing-a-plan", "Choosing a plan", "Guides")],
  changelog: [
    { date: "2026-11-02", title: "Yearly plans", body: ["Every plan can now be paid yearly."] },
    { date: "2026-10-15", title: "Team roles", body: ["Invite admins who can manage members."] },
  ] satisfies ChangelogEntry[],
  legal: [
    { kind: "privacy", sections: [{ id: "data", heading: "Data we collect", paragraphs: ["Your name and email."] }] },
    { kind: "terms", sections: [{ id: "use", heading: "Using the product", paragraphs: ["Use it lawfully."] }, { id: "billing", heading: "Billing", paragraphs: ["Plans renew until canceled."] }] },
  ] satisfies LegalDocument[],
}

const fake = (c: typeof CMS): Cms => ({
  getArticles: async () => c.articles,
  getArticleBySlug: async (slug) => c.articles.find((a) => a.slug === slug) ?? null,
  getLegalDocument: async (kind) => c.legal.find((d) => d.kind === kind) ?? null,
  getChangelogEntries: async () => c.changelog,
})

export const fakeCms = fake(CMS)
// An empty BaseHub repository.
export const emptyCms = fake({ articles: [], changelog: [], legal: [] })

const seo = createSeo({ origin: "https://app.test", siteName: "Acme" })
export const cmsModule = (cms: Cms) => ({ getCms: () => cms, getSeo: () => seo })
