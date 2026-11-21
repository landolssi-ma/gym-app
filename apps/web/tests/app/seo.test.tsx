import { describe, expect, it, vi } from "vitest"

import { CMS, cmsModule, fakeCms } from "../helpers/cms-fixture"

vi.mock("@/lib/cms", () => cmsModule(fakeCms))
vi.mock("@/lib/config", () => ({ getConfig: () => ({ APP_ORIGIN: "https://app.test" }) }))

import PostImage from "../../app/blog/[slug]/opengraph-image"
import HomeImage from "../../app/opengraph-image"
import robots from "../../app/robots"
import sitemap from "../../app/sitemap"
import { publicMetadata } from "../../lib/public-metadata"
import { STATIC_PUBLIC_PATHS } from "../../lib/public-paths"

describe("sitemap", () => {
  it("lists every public page and every published blog post on the app origin", async () => {
    const urls = (await sitemap()).map((e) => e.url)
    for (const p of STATIC_PUBLIC_PATHS) expect(urls).toContain(new URL(p, "https://app.test").href)
    for (const a of CMS.articles) expect(urls).toContain(`https://app.test/blog/${a.slug}`)
  })
})

describe("robots", () => {
  it("points to the sitemap and disallows the app, admin and API paths", () => {
    const r = robots()
    expect(r.sitemap).toBe("https://app.test/sitemap.xml")
    const disallow = (r.rules as { disallow: string[] }).disallow
    for (const p of ["/api/", "/admin", "/dashboard", "/settings"]) expect(disallow).toContain(p)
    for (const p of STATIC_PUBLIC_PATHS) expect(disallow).not.toContain(p)
  })
})

describe("page metadata", () => {
  it("sets a branded title, canonical URL and large-image link preview tags", () => {
    const m = publicMetadata("/help", "Help", "Get help")
    expect(m.title).toBe("Help · Acme")
    expect(m.alternates?.canonical).toBe("/help")
    expect(m.openGraph).toMatchObject({ title: "Help", description: "Get help", url: "/help", siteName: "Acme" })
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "Help" })
  })
})

describe("OG images", () => {
  it("render a PNG for a page and for a blog post", async () => {
    for (const res of [HomeImage(), await PostImage({ params: Promise.resolve({ slug: CMS.articles[0]!.slug }) })]) {
      expect(res.headers.get("content-type")).toBe("image/png")
      expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(1000)
    }
  })

  it("are not found for an unknown post", async () => {
    await expect(PostImage({ params: Promise.resolve({ slug: "nope" }) })).rejects.toThrow()
  })
})
