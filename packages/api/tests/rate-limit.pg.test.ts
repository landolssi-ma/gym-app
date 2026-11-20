import { Hono } from "hono"
import { afterAll, beforeEach, describe, expect, test, vi } from "vitest"

import { rateLimits } from "@workspace/db"
import { createTestDb, TEST_PG_URL } from "@workspace/db/testing"

import type { AppEnv } from "../src/index"
import { checkAndIncrementRateLimit, rateLimit } from "../src/rate-limit"
import { fakeDeps } from "./helpers/fake-deps"

const HOUR = 3_600_000

describe.skipIf(!TEST_PG_URL)("rate limits against real Postgres", () => {
  const { db, end } = TEST_PG_URL ? createTestDb() : ({} as ReturnType<typeof createTestDb>)
  afterAll(() => end?.())
  beforeEach(async () => {
    await db.delete(rateLimits)
  })

  const check = (subject: string, now: Date, limit = 3) => checkAndIncrementRateLimit(db, { subject, bucket: "test", limit, windowMs: HOUR, now })

  test("allows up to the limit in one window, then refuses", async () => {
    const now = new Date("2026-11-08T10:15:00Z")
    const results = []
    for (let i = 0; i < 4; i++) results.push((await check("user:a", now)).ok)
    expect(results).toEqual([true, true, true, false])
  })

  test("concurrent requests with one unit left: exactly one passes", async () => {
    const now = new Date("2026-11-08T10:15:00Z")
    await check("user:b", now, 2)
    const results = await Promise.all([check("user:b", now, 2), check("user:b", now, 2)])
    expect(results.filter((r) => r.ok)).toHaveLength(1)
  })

  test("a new window starts the count again", async () => {
    for (let i = 0; i < 4; i++) await check("user:c", new Date("2026-11-08T10:59:00Z"))
    expect((await check("user:c", new Date("2026-11-08T10:59:59Z"))).ok).toBe(false)
    expect((await check("user:c", new Date("2026-11-08T11:00:00Z"))).ok).toBe(true)
  })

  test("subjects and buckets are counted separately", async () => {
    const now = new Date()
    for (let i = 0; i < 3; i++) await check("user:d", now)
    expect((await check("user:e", now)).ok).toBe(true)
    expect((await checkAndIncrementRateLimit(db, { subject: "user:d", bucket: "other", limit: 3, windowMs: HOUR, now })).ok).toBe(true)
  })

  describe("rateLimit middleware", () => {
    const handler = vi.fn()
    const app = new Hono<AppEnv>()
      .use(async (c, next) => (c.set("deps", fakeDeps({ db })), next()))
      .post("/api/thing", rateLimit("thing", { limit: 2, windowMs: HOUR }), (c) => (handler(), c.json({ ok: true })))
    const post = (headers: Record<string, string>) => app.request("/api/thing", { method: "POST", headers })

    test("over the limit: 429 rate_limited and no side effect", async () => {
      handler.mockClear()
      const ip = { "cf-connecting-ip": "203.0.113.7" }
      expect((await post(ip)).status).toBe(200)
      expect((await post(ip)).status).toBe(200)
      const refused = await post(ip)
      expect(refused.status).toBe(429)
      expect(await refused.json()).toEqual({ error: "rate_limited" })
      expect(handler).toHaveBeenCalledTimes(2)
    })

    test("a forged x-forwarded-for does not change the counted IP", async () => {
      const real = "198.51.100.9"
      expect((await post({ "cf-connecting-ip": real, "x-forwarded-for": "1.1.1.1" })).status).toBe(200)
      expect((await post({ "cf-connecting-ip": real, "x-forwarded-for": "2.2.2.2" })).status).toBe(200)
      expect((await post({ "cf-connecting-ip": real, "x-forwarded-for": "3.3.3.3" })).status).toBe(429)
    })

    test("the raw IP is never stored", async () => {
      const rows = await db.select({ subject: rateLimits.subject }).from(rateLimits)
      expect(rows.some((r) => r.subject.includes("203.0.113.7") || r.subject.includes("198.51.100.9"))).toBe(false)
    })
  })
})
