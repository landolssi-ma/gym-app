import { describe, expect, it } from "vitest"

import { safeNext } from "../../../app/sign-in/safe-next"

const accepted = ["/dashboard", "/projects", "/admin", "/", "/projects?tab=archived", "/projects/abc123?x=1"]
const normalized = [
  ["/a/../admin", "/admin"],
  ["/./projects", "/projects"],
]

describe("safeNext", () => {
  it.each(accepted)("accepts %s", (next) => {
    expect(safeNext(next)).toBe(next)
  })

  it.each(normalized)("normalizes %s to %s", (next, out) => {
    expect(safeNext(next)).toBe(out)
  })

  it.each([
    // non-path inputs
    [undefined],
    [""],
    ["relative"],
    [["/dashboard"]],
    [" /evil.com"],
    // scheme-relative and backslash
    ["//evil.com"],
    ["///evil.com"],
    ["/\\evil.com"],
    ["\\\\evil.com"],
    // control characters (browsers strip them, leaving //host)
    ["/\t/evil.com"],
    ["/\n/evil.com"],
    ["/\r/evil.com"],
    // percent-encoded (incl. double-encoded and malformed)
    ["%2F%2Fevil.com"],
    ["/%2F%2Fevil.com"],
    ["/%2f/evil.com"],
    ["/%5Cevil.com"],
    ["/%5c%5cevil.com"],
    ["%5C%5Cevil.com"],
    ["/%09/evil.com"],
    ["/%252F%252Fevil.com"],
    ["/%E0%A4%A"],
    // absolute URLs
    ["https://evil.com"],
    ["HTTPS://evil.com"],
    ["http:evil.com"],
    // javascript:
    ["javascript:alert(1)"],
    ["JavaScript:alert(1)"],
    ["java\tscript:alert(1)"],
    ["/javascript:alert(1)"],
    // dot-segment collapse to // or /\ (the URL parser collapses after the input checks)
    ["/.//evil.com"],
    ["/..//evil.com"],
    ["/a/..//evil.com"],
    ["/a/b/../..//evil.com"],
    ["/%2e%2e//evil.com"],
    ["/%2E%2E//evil.com"],
    ["/%2e//evil.com"],
    ["/%2E/%2Fevil.com"],
    ["/./\\evil.com"],
  ])("rejects %j", (next) => {
    expect(safeNext(next as string | string[] | undefined)).toBeNull()
  })

  it("every accepted value is a same-origin relative path", () => {
    for (const next of [...accepted, ...normalized.map(([n]) => n)]) {
      const out = safeNext(next)!
      expect(out[0]).toBe("/")
      expect(["/", "\\"]).not.toContain(out[1])
      expect(new URL(out, "https://app.test").origin).toBe("https://app.test")
    }
  })

  it("never returns a path starting with // or /\\ (generated inputs)", () => {
    // mulberry32, fixed seed: deterministic, no dependency.
    let seed = 0x5afe0e57
    const rand = () => {
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    // "/" is drawn ~40% of the time so slash/dot-segment runs (the collapse class) are common.
    const tokens = ["/", "\\", ".", "..", "%2e", "%2E", "%2f", "%5c", "%252f", "%09", "\t", ":", "?", "#", "@", "a", "evil.com", "%"]
    const bad: string[] = []
    let collapseRejected = 0
    for (let i = 0; i < 6000; i++) {
      let input = rand() < 0.9 ? "/" : ""
      for (let n = 1 + Math.floor(rand() * 8); n > 0; n--) input += rand() < 0.4 ? "/" : tokens[Math.floor(rand() * tokens.length)]
      const out = safeNext(input)
      if (out === null) {
        // the collapse class: no leading // or /\\, yet the parser's pathname starts with //
        const naive = URL.parse(input, "https://x.invalid")
        if (!/^\/[/\\]/.test(input) && naive?.pathname.startsWith("//")) collapseRejected++
      } else if (out[0] !== "/" || out[1] === "/" || out[1] === "\\" || new URL(out, "https://app.test").origin !== "https://app.test") {
        bad.push(input)
      }
    }
    expect(bad.join(" ")).toBe("")
    expect(collapseRejected).toBeGreaterThan(0)
  })
})
