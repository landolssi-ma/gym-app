import { describe, expect, test } from "vitest"

import { createApi } from "../src/index"
import { APP, fakeDeps, forbidden } from "./helpers/fake-deps"

const UUID = "00000000-0000-4000-8000-000000000000"

// Exact METHOD + Hono path keys. A new route is treated as session-protected until its own key is
// reviewed and added here, so an unguarded route cannot slip in unnoticed.
// The health routes are token-gated and touch the database only with the smoke token.
// Better Auth answers /api/auth/* itself: sign-in and sign-up run before any session exists.
// /media serves public avatars and logos from the public storage folder only.
const PUBLIC = new Set(["GET /api/health", "GET /api/health/analytics", "GET /api/auth/*", "POST /api/auth/*", "GET /media/:key{[0-9a-f-]{36}}"])
const SIGNATURE = new Set(["GET /api/inngest", "PUT /api/inngest", "POST /api/inngest"])

function sorted(keys: string[]): string[] {
  return keys.sort((a, b) => {
    const [am, ap] = a.split(" ")
    const [bm, bp] = b.split(" ")
    return ap!.localeCompare(bp!) || am!.localeCompare(bm!)
  })
}

function routeKeys(app: ReturnType<typeof createApi>): string[] {
  return sorted([...new Set(app.routes.filter((route) => route.method !== "ALL").map((route) => `${route.method} ${route.path}`))])
}

async function request(key: string) {
  const accesses: string[] = []
  let jobsServed = 0
  const app = createApi(() =>
    fakeDeps({
      db: forbidden("db", accesses) as never,
      storage: forbidden("storage", accesses) as never,
      // No session: a guarded route must answer 401 here.
      auth: { getSession: async () => null } as never,
      jobs: { define: () => ({}), serve: () => (jobsServed++, () => new Response(null, { status: 401 })) } as never,
    }),
  )
  const [method, route] = key.split(" ") as [string, string]
  const path = route.replace(/:[^/]+/g, UUID).replace(/\*/g, "x")
  const response = await app.request(`${APP}${path}`, {
    method,
    headers: { origin: APP, "content-type": "application/json" },
    ...(!["GET", "HEAD"].includes(method) ? { body: "{}" } : {}),
  })
  return { status: response.status, accesses, jobsServed }
}

describe("API route protection table", () => {
  test("every public and signature exception is an exact registered route", () => {
    const keys = routeKeys(createApi(() => fakeDeps()))
    expect(keys.length).toBeGreaterThan(0)
    expect(sorted([...PUBLIC, ...SIGNATURE].filter((key) => !keys.includes(key)))).toEqual([])
  })

  test("all remaining routes require a session before database or storage access", async () => {
    const session = routeKeys(createApi(() => fakeDeps())).filter((key) => !PUBLIC.has(key) && !SIGNATURE.has(key))
    const offenders: string[] = []
    for (const key of session) {
      const r = await request(key)
      if (r.status !== 401 || r.accesses.length) offenders.push(`${key} -> ${r.status}; touched=${r.accesses.join(",")}`)
    }
    expect(offenders).toEqual([])
  })

  test("signature routes reject unsigned requests before database access and delegate to Inngest", async () => {
    for (const key of SIGNATURE) {
      const r = await request(key)
      expect(r.status, key).toBeGreaterThanOrEqual(400)
      expect(r.accesses, key).toEqual([])
      expect(r.jobsServed, key).toBe(key.endsWith("/api/inngest") ? 1 : 0)
    }
  })

  test("a newly registered unguarded route is detected", async () => {
    const app = createApi(() => fakeDeps())
    app.get("/api/zz-probe", (c) => c.json({ ok: true }))
    expect(routeKeys(app)).toContain("GET /api/zz-probe")
    expect(PUBLIC.has("GET /api/zz-probe")).toBe(false)
    expect((await app.request(`${APP}/api/zz-probe`)).status).not.toBe(401)
  })
})
