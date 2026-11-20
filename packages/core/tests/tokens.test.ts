import { describe, expect, it } from "vitest"

import { CAPABILITY_TOKEN_RE, createCapabilityToken, hashCapabilityToken } from "../src/tokens"

describe("createCapabilityToken", () => {
  it("returns a 43-char base64url string with no padding", () => {
    const token = createCapabilityToken()
    expect(token).toMatch(CAPABILITY_TOKEN_RE)
    expect(token).not.toContain("+")
    expect(token).not.toContain("/")
    expect(token).not.toContain("=")
  })

  it("never repeats across calls (256 bits of crypto.getRandomValues entropy)", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => createCapabilityToken()))
    expect(tokens.size).toBe(50)
  })
})

describe("hashCapabilityToken", () => {
  it("returns a deterministic 64-char hex SHA-256 digest", async () => {
    const hash = await hashCapabilityToken("abc")
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashCapabilityToken("abc")).toBe(hash)
  })

  it("different tokens hash to different digests", async () => {
    expect(await hashCapabilityToken("abc")).not.toBe(await hashCapabilityToken("xyz"))
  })
})
