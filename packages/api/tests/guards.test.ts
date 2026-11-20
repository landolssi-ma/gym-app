import { Hono, type MiddlewareHandler } from "hono"
import { describe, expect, test, vi } from "vitest"

import type { ActiveOrganization, AuthSession } from "@workspace/auth"

import { forbidWhileImpersonating, requireActiveOrg, requireActiveOrgAllowSuspended, requireAdmin, requireAi, requireOrgRole, requireUser, type GuardEnv } from "../src/guards"
import type { Deps } from "../src/index"
import { fakeDeps, forbidden } from "./helpers/fake-deps"

const session = (impersonatedBy: string | null = null): AuthSession => ({
  user: { id: "u1", name: "Ada", email: "a@test", image: null },
  session: { id: "s1", token: "t", activeOrganizationId: "org1", impersonatedBy },
})
const org = (over: Partial<ActiveOrganization> = {}): ActiveOrganization => ({ id: "org1", name: "Acme", logo: null, role: "member", suspended: false, noTrial: false, ...over })

function app(auth: Record<string, unknown>, ...guards: MiddlewareHandler<GuardEnv>[]) {
  return new Hono<GuardEnv>()
    .use(async (c, next) => (c.set("deps", fakeDeps({ auth: { isImpersonating: (s: AuthSession) => s.session.impersonatedBy !== null, ...auth } as never })), next()))
    .get("/x", ...(guards as [never]), (c) => c.json({ orgId: c.var.orgId ?? null, role: c.var.orgRole ?? null }))
}
const get = (a: ReturnType<typeof app>, headers: Record<string, string> = {}) => a.request("/x", { headers })

describe("requireUser", () => {
  test("no session: 401 unauthorized and the expiring cookie is forwarded", async () => {
    const getSession = async ({ responseHeaders }: { responseHeaders: Headers }) => (responseHeaders.append("set-cookie", "__Host-acme.session_token=; Max-Age=0"), null)
    const res = await get(app({ getSession }, requireUser))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: "unauthorized" })
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0")
  })
})

describe("requireActiveOrg", () => {
  const auth = (o: ActiveOrganization | null) => ({ getSession: async () => session(), getActiveOrganization: vi.fn(async () => o) })

  test("sets the workspace resolved from the session", async () => {
    expect(await (await get(app(auth(org()), requireUser, requireActiveOrg))).json()).toEqual({ orgId: "org1", role: "member" })
  })

  test("no workspace: 403 no_organization", async () => {
    const res = await get(app(auth(null), requireUser, requireActiveOrg))
    expect([res.status, await res.json()]).toEqual([403, { error: "no_organization" }])
  })

  test("a stale x-org-id is 409 org_changed; the header never selects the workspace", async () => {
    const res = await get(app(auth(org()), requireUser, requireActiveOrg), { "x-org-id": "org2" })
    expect([res.status, await res.json()]).toEqual([409, { error: "org_changed" }])
    expect((await get(app(auth(org()), requireUser, requireActiveOrg), { "x-org-id": "org1" })).status).toBe(200)
  })

  test("a suspended workspace is 403 org_suspended except through the allow-suspended variant", async () => {
    const res = await get(app(auth(org({ suspended: true })), requireUser, requireActiveOrg))
    expect([res.status, await res.json()]).toEqual([403, { error: "org_suspended" }])
    expect((await get(app(auth(org({ suspended: true })), requireUser, requireActiveOrgAllowSuspended))).status).toBe(200)
  })

  test("membership is re-checked on every request", async () => {
    const a = auth(org())
    const guarded = app(a, requireUser, requireActiveOrg)
    await get(guarded)
    await get(guarded)
    expect(a.getActiveOrganization).toHaveBeenCalledTimes(2)
  })
})

describe("requireOrgRole", () => {
  const as = (role: ActiveOrganization["role"]) => ({ getSession: async () => session(), getActiveOrganization: async () => org({ role }) })
  test.each([
    ["owner", 200],
    ["admin", 200],
    ["member", 403],
  ] as const)("owner or admin route, %s -> %i", async (role, want) => {
    const res = await get(app(as(role), requireUser, requireActiveOrg, requireOrgRole("owner", "admin")))
    expect(res.status).toBe(want)
    if (want === 403) expect(await res.json()).toEqual({ error: "forbidden" })
  })
})

describe("requireAdmin", () => {
  test("reads the platform role fresh on every request", async () => {
    const hasRole = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    const guarded = app({ getSession: async () => session(), hasRole }, requireUser, requireAdmin)
    expect((await get(guarded)).status).toBe(200)
    const refused = await get(guarded)
    expect([refused.status, await refused.json()]).toEqual([403, { error: "forbidden" }])
    expect(hasRole).toHaveBeenCalledWith("u1", "admin")
  })
})

describe("forbidWhileImpersonating", () => {
  test("403 impersonating for an impersonation session", async () => {
    const res = await get(app({ getSession: async () => session("admin1") }, requireUser, forbidWhileImpersonating))
    expect([res.status, await res.json()]).toEqual([403, { error: "impersonating" }])
    expect((await get(app({ getSession: async () => session() }, requireUser, forbidWhileImpersonating))).status).toBe(200)
  })
})

describe("requireAi", () => {
  // The handler stands for what follows the guard: a meter, then the model call.
  function aiApp(deps: Partial<Deps>) {
    const reached = vi.fn()
    const a = new Hono<GuardEnv>()
      .use(async (c, next) => (c.set("deps", fakeDeps(deps)), next()))
      .get("/x", requireAi, (c) => (reached(), c.json({ same: c.var.ai === deps.ai })))
    return { a, reached }
  }

  test("AI off: 503 ai_unavailable, and nothing after the guard runs", async () => {
    const accesses: string[] = []
    const { a, reached } = aiApp({ db: forbidden("db", accesses) as Deps["db"] })
    const res = await a.request("/x")
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: "ai_unavailable" })
    expect(reached).not.toHaveBeenCalled()
    expect(accesses).toEqual([])
  })

  test("AI on: the route gets it as c.var.ai", async () => {
    const { a } = aiApp({ ai: {} as Deps["ai"] })
    expect(await (await a.request("/x")).json()).toEqual({ same: true })
  })
})
