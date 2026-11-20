import { describe, expect, test, vi } from "vitest"

import { createApi } from "../src/index"
import { APP, fakeDeps, forbidden } from "./helpers/fake-deps"

const token = { "x-smoke-token": "test-smoke-token-0001" }

describe("health route", () => {
  test("without the smoke token: 404 not_found and the database is never touched", async () => {
    const accesses: string[] = []
    const app = createApi(() => fakeDeps({ db: forbidden("db", accesses) as never }))
    const res = await app.request(`${APP}/api/health`)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "not_found" })
    expect(accesses).toEqual([])
  })

  test("with a wrong token: 404", async () => {
    const app = createApi(() => fakeDeps())
    expect((await app.request(`${APP}/api/health`, { headers: { "x-smoke-token": "wrong" } })).status).toBe(404)
  })

  test("database unreachable: 5xx", async () => {
    const unreachable = { select: () => ({ from: () => ({ where: async () => { throw new Error("connect ECONNREFUSED") } }) }) }
    const app = createApi(() => fakeDeps({ db: unreachable as never }))
    expect((await app.request(`${APP}/api/health`, { headers: token })).status).toBe(500)
  })

  test("analytics probe reports false when PostHog is not configured", async () => {
    const app = createApi(() => fakeDeps())
    expect(await (await app.request(`${APP}/api/health/analytics`, { headers: token })).json()).toEqual({ analytics: false })
    const capture = vi.fn(async () => 200)
    const configured = createApi(() => fakeDeps({ analytics: { capture } }))
    expect(await (await configured.request(`${APP}/api/health/analytics`, { headers: token })).json()).toEqual({ analytics: true })
  })
})
