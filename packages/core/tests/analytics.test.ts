import { afterEach, describe, expect, test, vi } from "vitest"

import { createAnalytics } from "../src/index"

const analytics = createAnalytics({ key: "phc_test", host: "https://ph.test" })
const calls: { url: string; init: RequestInit }[] = []
const stubFetch = (impl: () => Promise<Response>) =>
  vi.stubGlobal("fetch", (url: string, init: RequestInit) => (calls.push({ url, init }), impl()))

afterEach(() => {
  vi.unstubAllGlobals()
  calls.length = 0
})

describe("createAnalytics", () => {
  test("capture POSTs the PostHog event JSON and returns the status", async () => {
    stubFetch(async () => new Response(null, { status: 200 }))
    expect(await analytics.capture("page_published", "user_1", { pageId: "p1", firstPublish: true })).toBe(200)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe("https://ph.test/i/v0/e/")
    expect(calls[0]!.init.method).toBe("POST")
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      api_key: "phc_test",
      event: "page_published",
      distinct_id: "user_1",
      properties: { pageId: "p1", firstPublish: true },
    })
  })

  test("non-2xx returns its status without throwing", async () => {
    stubFetch(async () => new Response(null, { status: 503 }))
    expect(await analytics.capture("x", "u")).toBe(503)
  })

  test("network error returns 0 without throwing", async () => {
    stubFetch(async () => {
      throw new TypeError("network")
    })
    expect(await analytics.capture("x", "u")).toBe(0)
  })

  test("an email property is never sent", async () => {
    stubFetch(async () => new Response(null, { status: 200 }))
    await analytics.capture("x", "u", { email: "a@b.test", pageId: "p1" })
    expect(JSON.parse(calls[0]!.init.body as string).properties).toEqual({ pageId: "p1" })
  })
})
