import { afterEach, describe, expect, test, vi } from "vitest"

import { createSeo } from "../src/seo"

const seo = createSeo({ origin: "https://app.test", siteName: "Acme" })

describe("createSeo config", () => {
  test("valid config constructs", () => {
    expect(() => createSeo({ origin: "https://app.test", siteName: "Acme" })).not.toThrow()
  })
  test.each([
    ["missing origin", { siteName: "Acme" }],
    ["invalid origin", { origin: "not a url", siteName: "Acme" }],
    ["missing siteName", { origin: "https://app.test" }],
  ])("%s throws at construction", (_, bad) => {
    expect(() => createSeo(bad as never)).toThrow()
  })
})

describe("structured data", () => {
  test("Article maps fields and resolves URLs against the origin", () => {
    expect(
      seo.buildBlogPostingJsonLd({ path: "/blog/a", title: "T", description: "D", image: "/img/a.jpg", datePublished: "2026-11-03" }),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: "T",
      description: "D",
      image: "https://app.test/img/a.jpg",
      url: "https://app.test/blog/a",
      mainEntityOfPage: "https://app.test/blog/a",
      datePublished: "2026-11-03",
      author: { "@type": "Organization", name: "Acme", url: "https://app.test/" },
      publisher: { "@type": "Organization", name: "Acme", url: "https://app.test/" },
    })
  })
  test("Article keeps absolute image URLs (CMS assets)", () => {
    expect(seo.buildBlogPostingJsonLd({ path: "/b", title: "T", description: "D", image: "https://assets.test/x.jpg" }).image).toBe("https://assets.test/x.jpg")
  })
  test("FAQPage has one Question per pair, in order", () => {
    expect(seo.buildFaqPageJsonLd([{ question: "Q1", answer: "A1" }, { question: "Q2", answer: "A2" }]).mainEntity).toEqual([
      { "@type": "Question", name: "Q1", acceptedAnswer: { "@type": "Answer", text: "A1" } },
      { "@type": "Question", name: "Q2", acceptedAnswer: { "@type": "Answer", text: "A2" } },
    ])
  })
  test("Organization comes from config", () => {
    expect(seo.buildOrganizationJsonLd()).toEqual({ "@context": "https://schema.org", "@type": "Organization", name: "Acme", url: "https://app.test/" })
  })
  test("BreadcrumbList preserves order with absolute URLs", () => {
    expect(seo.buildBreadcrumbListJsonLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }]).itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://app.test/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://app.test/blog" },
    ])
  })
  test("no Product builder", () => {
    expect(Object.keys(seo).filter((k) => /product/i.test(k))).toEqual([])
  })
})

describe("sitemap", () => {
  afterEach(() => vi.unstubAllGlobals())
  test("one absolute entry per path, with no network access", () => {
    vi.stubGlobal("fetch", () => {
      throw new Error("sitemap must not fetch")
    })
    expect(seo.buildSitemap(["/", "/blog/a"])).toEqual([{ url: "https://app.test/" }, { url: "https://app.test/blog/a" }])
  })
  test("empty list -> empty sitemap", () => {
    expect(seo.buildSitemap([])).toEqual([])
  })
})

describe("site-wide and pricing structured data", () => {
  test("website", () => {
    expect(seo.buildWebsiteJsonLd()).toEqual({ "@context": "https://schema.org", "@type": "WebSite", name: "Acme", url: "https://app.test/" })
  })

  test("one offer per plan and interval with its price", () => {
    const ld = seo.buildOffersJsonLd([{ name: "Pro monthly", priceUsd: 79, interval: "month" }, { name: "Pro yearly", priceUsd: 790, interval: "year" }])
    expect(ld.offers).toHaveLength(2)
    expect(ld.offers[1]).toMatchObject({ "@type": "Offer", price: "790.00", priceCurrency: "USD", priceSpecification: { unitCode: "ANN" } })
  })
})
