import { describe, expect, it, vi } from "vitest"

import { CMS, cmsModule, fakeCms } from "../helpers/cms-fixture"

vi.mock("@/lib/cms", () => cmsModule(fakeCms))
vi.mock("next/navigation", () => ({ usePathname: () => "/blog", notFound: () => { throw new Error("NEXT_NOT_FOUND") } }))

import { t } from "@workspace/i18n"

import ArticlePage, { generateMetadata } from "../../app/blog/[slug]/page"
import { renderServer } from "../helpers/render-server"

const article = CMS.articles[0]!
const params = (slug: string) => ({ params: Promise.resolve({ slug }) })
const html = await renderServer(<ArticlePage {...params(article.slug)} />)

describe("Blog post", () => {
  it("renders every section of the article inside the marketing shell", () => {
    for (const s of article.sections) expect(html).toContain(s.heading)
    expect(html).toContain(t("blogPage.back"))
    expect(html).toContain(t("blogPage.keepReading"))
    expect(html).toContain('id="main-content"')
  })

  it("has article metadata with a canonical URL", async () => {
    const metadata = await generateMetadata(params(article.slug))
    expect(metadata.openGraph).toMatchObject({ type: "article", title: article.title, description: article.description })
    expect(metadata.alternates?.canonical).toBe(`/blog/${article.slug}`)
  })

  it("has BlogPosting and BreadcrumbList structured data", () => {
    expect(html).toContain('"@type":"BlogPosting"')
    expect(html).toContain(`"headline":"${article.title}"`)
    expect(html).toContain('"@type":"BreadcrumbList"')
  })

  it("an unknown slug is not found", async () => {
    await expect(ArticlePage(params("does-not-exist"))).rejects.toThrow("NEXT_NOT_FOUND")
    await expect(generateMetadata(params("does-not-exist"))).rejects.toThrow("NEXT_NOT_FOUND")
  })
})
