import { afterEach, describe, expect, test, vi } from "vitest"

const revalidateTag = vi.fn()
vi.mock("next/cache", () => ({ revalidateTag }))

const { createCms, invalidate, CMS_REVALIDATE } = await import("../src/cms")

const config = { provider: "basehub", apiKey: "read-token", apiUrl: "https://cms.test/graphql" } as const
const img = (name: string) => ({ url: `https://assets.test/${name}.jpg`, alt: `${name} alt`, width: 1440, height: 810 })
const list = <T>(items: T[]) => ({ items })

// Fixtures shaped like BaseHub's GraphQL response for each collection.
const ROWS = {
  articles: [
    {
      _title: "Shipping faster", slug: "shipping-faster", description: "d", category: "Guides", image: img("a"),
      imageCreditLabel: null, imageCreditHref: null, intro: "i",
      sections: list([{ _title: "Why", anchor: "why", body: { markdown: "One.\n\nTwo \\*really\\*.\n\n- a\n- b" } }]),
      sources: list([{ _title: "FTC", href: "https://ftc.test" }]),
    },
  ],
  legalDocuments: ["terms", "privacy"].map((kind) => ({
    kind, sections: list([{ _title: "Scope", anchor: "scope", body: { markdown: `${kind} text` } }]),
  })),
  changelogEntries: [{ _title: "Launch", date: "2026-10-01T00:00:00.000Z", body: { markdown: "First.\n\nSecond." } }],
}
type Collection = keyof typeof ROWS

function respond(collection: Collection, items: unknown[] = ROWS[collection]) {
  const fetch = vi.fn(async () => Response.json({ data: { [collection]: { items } } }))
  vi.stubGlobal("fetch", fetch)
  return fetch
}
const nextOptions = (fetch: ReturnType<typeof respond>) => (fetch.mock.calls[0] as unknown as [string, { next: unknown }])[1].next

afterEach(() => vi.unstubAllGlobals())

describe("createCms config", () => {
  test("valid config constructs", () => {
    expect(() => createCms(config)).not.toThrow()
  })
  test.each([
    ["missing apiKey", { ...config, apiKey: "" }],
    ["unknown provider", { ...config, provider: "contentful" }],
    ["missing apiUrl", { provider: "basehub", apiKey: "k" }],
  ])("%s throws at construction", (_, bad) => {
    expect(() => createCms(bad as never)).toThrow()
  })
})

describe("slug lookups", () => {
  const cases = [
    ["articles", "articles", (c: ReturnType<typeof createCms>, s: string) => c.getArticleBySlug(s), "shipping-faster"],
  ] as const

  test.each(cases)("%s: known slug, tagged and windowed", async (_, collection, get, slug) => {
    const fetch = respond(collection)
    expect(await get(createCms(config), slug)).toMatchObject({ slug })
    expect(nextOptions(fetch)).toEqual({ tags: [`cms:${collection}`], revalidate: 3600 })
  })
  test.each(cases)("%s: unknown slug -> null", async (_, collection, get) => {
    respond(collection)
    expect(await get(createCms(config), "nope")).toBeNull()
  })
  test.each(cases)("%s: malformed row -> validation error", async (_, collection, get, slug) => {
    respond(collection, [{ ...ROWS[collection][0], slug: null }])
    await expect(get(createCms(config), slug)).rejects.toThrow()
  })
})

describe("mapping", () => {
  test("article rich text -> paragraphs and bullets, unescaped; sources and image", async () => {
    respond("articles")
    const [a] = await createCms(config).getArticles()
    expect(a).toMatchObject({ title: "Shipping faster", image: { src: "https://assets.test/a.jpg", alt: "a alt", width: 1440, height: 810 }, imageCredit: undefined })
    expect(a!.sections).toEqual([{ id: "why", heading: "Why", paragraphs: ["One.", "Two *really*."], bullets: ["a", "b"] }])
    expect(a!.sources).toEqual([{ label: "FTC", href: "https://ftc.test" }])
  })
})

describe("legal documents", () => {
  test.each(["terms", "privacy"] as const)("%s", async (kind) => {
    const fetch = respond("legalDocuments")
    expect(await createCms(config).getLegalDocument(kind)).toEqual({
      kind, sections: [{ id: "scope", heading: "Scope", paragraphs: [`${kind} text`], bullets: undefined }],
    })
    expect(nextOptions(fetch)).toEqual({ tags: ["cms:legal"], revalidate: 86400 })
  })
  test("unrecognized kind -> null", async () => {
    respond("legalDocuments")
    expect(await createCms(config).getLegalDocument("cookies" as never)).toBeNull()
  })
})

describe("changelog", () => {
  test("list shape, newest first query", async () => {
    const fetch = respond("changelogEntries")
    expect(await createCms(config).getChangelogEntries()).toEqual([{ date: "2026-10-01T00:00:00.000Z", title: "Launch", body: ["First.", "Second."] }])
    expect(nextOptions(fetch)).toEqual({ tags: ["cms:changelog"], revalidate: 3600 })
    expect(JSON.stringify(fetch.mock.calls[0])).toContain("date__DESC")
  })
  test("malformed entry -> validation error", async () => {
    respond("changelogEntries", [{ ...ROWS.changelogEntries[0], date: null }])
    await expect(createCms(config).getChangelogEntries()).rejects.toThrow()
  })
})

describe("requests", () => {
  test("never ask for draft content", async () => {
    const fetch = respond("articles")
    await createCms(config).getArticles()
    const [url, init] = fetch.mock.calls[0] as unknown as [string, { headers: Record<string, string> }]
    expect(url).toBe(config.apiUrl)
    expect(init.headers["x-basehub-token"]).toBe("read-token")
    expect(init.headers).not.toHaveProperty("x-basehub-draft")
  })
  test("GraphQL errors throw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errors: [{ message: "boom" }] })))
    await expect(createCms(config).getArticles()).rejects.toThrow("boom")
  })
})

describe("invalidate", () => {
  test.each(Object.keys(CMS_REVALIDATE) as (keyof typeof CMS_REVALIDATE)[])("%s", (type) => {
    invalidate(type)
    expect(revalidateTag).toHaveBeenLastCalledWith(`cms:${type}`, { expire: 0 })
  })
})
