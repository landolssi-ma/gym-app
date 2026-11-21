import { describe, expect, it, vi } from "vitest"

import { CMS, cmsModule, emptyCms, fakeCms } from "../helpers/cms-fixture"

const mocks = vi.hoisted(() => ({ cms: null as unknown }))
vi.mock("@/lib/cms", () => ({ ...cmsModule(fakeCms), getCms: () => mocks.cms }))
vi.mock("next/navigation", () => ({ usePathname: () => "/blog", notFound: () => { throw new Error("NEXT_NOT_FOUND") } }))

import { t } from "@workspace/i18n"

import BlogPage from "../../app/blog/page"
import { renderServer } from "../helpers/render-server"

describe("Blog index", () => {
  it("renders every CMS article with its URL, and a topic per category", async () => {
    mocks.cms = fakeCms
    const html = await renderServer(<BlogPage />)
    expect(html.match(/data-article-card/g)).toHaveLength(CMS.articles.length)
    for (const a of CMS.articles) expect(html).toContain(`href="/blog/${a.slug}"`)
    for (const topic of ["Guides", "Projects"]) expect(html.match(new RegExp(`aria-pressed="false"[^>]*>${topic}<`, "g"))).toHaveLength(1)
    expect(html).toContain('"@type":"BreadcrumbList"')
  })

  it("shows the empty state when the CMS has no posts", async () => {
    mocks.cms = emptyCms
    const html = await renderServer(<BlogPage />)
    expect(html).not.toContain("data-article-card")
    expect(html).toContain(t("blogPage.empty"))
  })
})
