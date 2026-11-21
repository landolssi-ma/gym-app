import { describe, expect, test } from "vitest"

import { renderOgImage } from "../src/og"

describe("renderOgImage", () => {
  test.each([
    ["title only", { title: "Getting started with your first project" }],
    ["eyebrow, title and tag", { eyebrow: "Guide", title: "Shipping faster", tag: "example.com" }],
  ])("%s -> 200 PNG", async (_, input) => {
    const res = renderOgImage(input)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("image/png")
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(1000)
  })
})
