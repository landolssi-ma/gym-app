import { afterAll, describe, expect, test } from "vitest"

import { auditLogs, eq, session, subscriptions, user } from "@workspace/db"
import { TEST_PG_URL } from "@workspace/db/testing"

import { createPgApp } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("backoffice routes against real Postgres", () => {
  const t = TEST_PG_URL ? createPgApp() : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  const get = async <T,>(path: string, cookie: string) => {
    const res = await t.call(`/api/admin${path}`, { cookie })
    return { status: res.status, body: (await res.json().catch(() => null)) as T }
  }
  const post = (path: string, cookie: string, body: unknown = {}) => t.call(`/api/admin${path}`, { method: "POST", cookie, body })
  const idOf = async (email: string) => (await t.db.select({ id: user.id }).from(user).where(eq(user.email, email)))[0]!.id

  // A signed-in platform admin, granted the way AGENTS.md documents: a direct database update.
  async function platformAdmin(tag = "admin") {
    const email = t.email(tag)
    const jar = await t.signIn(email)
    await t.db.update(user).set({ role: "admin" }).where(eq(user.email, email))
    return { email, jar, id: await idOf(email) }
  }
  async function person(tag: string) {
    const email = t.email(tag)
    const jar = await t.signIn(email)
    return { email, jar, id: await idOf(email) }
  }
  const me = (cookie: string) => t.call("/api/me", { cookie })

  describe("access", () => {
    test("a platform admin passes the check; a regular user and a workspace owner get 403 forbidden everywhere", async () => {
      const admin = await platformAdmin()
      expect((await t.call("/api/admin/check", { cookie: admin.jar })).status).toBe(204)
      const owner = await t.owner("ws-owner")
      for (const path of ["/check", "/users", "/organizations", "/subscriptions", "/audit", `/users/${admin.id}`, `/organizations/${owner.orgId}`]) {
        const res = await get(path, owner.jar)
        expect([path, res.status, res.body]).toEqual([path, 403, { error: "forbidden" }])
      }
      expect((await post(`/organizations/${owner.orgId}/suspend`, owner.jar, { reason: "x" })).status).toBe(403)
    })

    test("a removed role takes effect on the very next request", async () => {
      const admin = await platformAdmin()
      expect((await get("/users", admin.jar)).status).toBe(200)
      await t.db.update(user).set({ role: "user" }).where(eq(user.id, admin.id))
      expect((await get("/users", admin.jar)).status).toBe(403)
    })

    test("platform admin grants no workspace role", async () => {
      const admin = await platformAdmin()
      const owner = await t.owner("not-yours")
      expect((await t.call(`/api/organizations/${owner.orgId}/switch`, { method: "POST", cookie: admin.jar })).status).toBe(404)
    })
  })

  describe("users", () => {
    test("search by part of an email lists name, email, sign-up date and ban state", async () => {
      const admin = await platformAdmin()
      const u = await person("findme-zq")
      const { body } = await get<{ users: { id: string; email: string; name: string; createdAt: string; banned: boolean | null }[] }>(`/users?q=findme-zq`, admin.jar)
      expect(body.users.map((x) => x.id)).toEqual([u.id])
      expect(body.users[0]).toMatchObject({ email: u.email, banned: false })
      expect(Date.parse(body.users[0]!.createdAt)).not.toBeNaN()
    })

    test("detail shows workspaces with roles, active sessions, ban state and sign-up date", async () => {
      const admin = await platformAdmin()
      const owner = await t.owner("detail")
      const id = await idOf(owner.email)
      const { body } = await get<{ organizations: { id: string; role: string }[]; sessions: { id: string }[]; banned: boolean; createdAt: string }>(`/users/${id}`, admin.jar)
      expect(body.organizations).toEqual([expect.objectContaining({ id: owner.orgId, role: "owner" })])
      expect(body.sessions).toHaveLength(1)
      expect(body.banned).toBe(false)
      expect((await get(`/users/nope`, admin.jar)).status).toBe(404)
    })

    test("ban with a reason and an end date revokes every session and blocks sign-in; unban lets them back", async () => {
      const admin = await platformAdmin()
      const u = await person("banned")
      const second = await t.signIn(u.email)
      const until = new Date(Date.now() + 86_400_000).toISOString()
      expect((await post(`/users/${u.id}/ban`, admin.jar, { reason: "spam", expiresAt: until })).status).toBe(200)
      expect(await t.db.select().from(session).where(eq(session.userId, u.id))).toEqual([])
      for (const jar of [u.jar, second]) expect((await me(jar)).status).toBe(401)
      await expect(t.signIn(u.email)).rejects.toThrow()
      const [row] = await t.db.select({ banned: user.banned, banReason: user.banReason, banExpires: user.banExpires }).from(user).where(eq(user.id, u.id))
      expect(row).toEqual({ banned: true, banReason: "spam", banExpires: new Date(until) })
      expect((await post(`/users/${u.id}/unban`, admin.jar)).status).toBe(200)
      expect((await me(await t.signIn(u.email))).status).toBe(200)
    })

    test("a ban needs a reason, and an end date in the past is refused", async () => {
      const admin = await platformAdmin()
      const u = await person("badban")
      expect((await post(`/users/${u.id}/ban`, admin.jar, {})).status).toBe(400)
      expect((await post(`/users/${u.id}/ban`, admin.jar, { reason: "x", expiresAt: new Date(Date.now() - 1000).toISOString() })).status).toBe(400)
      expect((await me(u.jar)).status).toBe(200)
    })

    test("banning another platform admin, or oneself, is 403 forbidden and changes nothing", async () => {
      const admin = await platformAdmin()
      const other = await platformAdmin("other-admin")
      for (const id of [other.id, admin.id]) {
        const res = await post(`/users/${id}/ban`, admin.jar, { reason: "x" })
        expect([res.status, await res.json()]).toEqual([403, { error: "forbidden" }])
      }
      expect((await me(other.jar)).status).toBe(200)
    })

    test("revoking one session signs only that session out", async () => {
      const admin = await platformAdmin()
      const u = await person("two-sessions")
      const other = await t.signIn(u.email)
      const sessions = (await get<{ sessions: { id: string }[] }>(`/users/${u.id}`, admin.jar)).body.sessions
      expect(sessions).toHaveLength(2)
      const [first] = await t.db.select({ id: session.id }).from(session).where(eq(session.userId, u.id)).orderBy(session.createdAt)
      expect((await post(`/users/${u.id}/sessions/${first!.id}/revoke`, admin.jar)).status).toBe(200)
      expect((await me(u.jar)).status).toBe(401)
      expect((await me(other)).status).toBe(200)
      const stranger = await person("stranger")
      const [theirs] = await t.db.select({ id: session.id }).from(session).where(eq(session.userId, stranger.id))
      expect((await post(`/users/${u.id}/sessions/${theirs!.id}/revoke`, admin.jar)).status).toBe(404)
      expect((await me(stranger.jar)).status).toBe(200)
    })
  })

  describe("workspaces", () => {
    test("search by name or id; detail shows members with roles and the subscription", async () => {
      const admin = await platformAdmin()
      const owner = await t.owner("ws-detail")
      const named = await t.call("/api/organizations", { method: "POST", cookie: owner.jar, body: { name: "Zebra Quartz Co" } })
      const { id: zebra } = (await named.json()) as { id: string }
      expect((await get<{ organizations: { id: string }[] }>("/organizations?q=zebra quartz", admin.jar)).body.organizations.map((o) => o.id)).toEqual([zebra])
      expect((await get<{ organizations: { id: string; ownerEmail: string; memberCount: number }[] }>(`/organizations?q=${owner.orgId}`, admin.jar)).body.organizations).toEqual([
        expect.objectContaining({ id: owner.orgId, ownerEmail: owner.email, memberCount: 1 }),
      ])
      const { body } = await get<{ members: { email: string; role: string }[]; subscription: { plan: string; status: string; currentPeriodEnd: string } }>(`/organizations/${owner.orgId}`, admin.jar)
      expect(body.members).toEqual([expect.objectContaining({ email: owner.email, role: "owner" })])
      expect(body.subscription).toMatchObject({ plan: "pro", status: "active" })
      expect(Date.parse(body.subscription.currentPeriodEnd)).toBeGreaterThan(Date.now())
    })

    test("suspend with a reason: members get org_suspended on their next request; unsuspend restores access", async () => {
      const admin = await platformAdmin()
      const owner = await t.owner("suspended")
      expect((await post(`/organizations/${owner.orgId}/suspend`, admin.jar, {})).status).toBe(400)
      expect((await post(`/organizations/${owner.orgId}/suspend`, admin.jar, { reason: "chargeback" })).status).toBe(200)
      const refused = await t.call("/api/team", { cookie: owner.jar })
      expect([refused.status, await refused.json()]).toEqual([403, { error: "org_suspended" }])
      expect((await post(`/organizations/${owner.orgId}/unsuspend`, admin.jar)).status).toBe(200)
      expect((await t.call("/api/team", { cookie: owner.jar })).status).toBe(200)
      expect((await post(`/organizations/not-a-workspace/suspend`, admin.jar, { reason: "x" })).status).toBe(404)
    })
  })

  test("subscriptions: filter by status and plan, each linking to its workspace", async () => {
    const admin = await platformAdmin()
    const due = await t.owner("past-due", "starter")
    await t.db.update(subscriptions).set({ status: "past_due" }).where(eq(subscriptions.organizationId, due.orgId))
    const live = await t.owner("live", "business")
    type List = { subscriptions: { organizationId: string; organizationName: string; plan: string; interval: string; status: string; currentPeriodEnd: string; cancelAtPeriodEnd: boolean }[] }
    const pastDue = (await get<List>("/subscriptions?status=past_due", admin.jar)).body.subscriptions
    expect(pastDue.every((s) => s.status === "past_due")).toBe(true)
    expect(pastDue.map((s) => s.organizationId)).toContain(due.orgId)
    expect(pastDue.map((s) => s.organizationId)).not.toContain(live.orgId)
    const business = (await get<List>("/subscriptions?plan=business", admin.jar)).body.subscriptions
    expect(business.every((s) => s.plan === "business")).toBe(true)
    expect(business.find((s) => s.organizationId === live.orgId)).toMatchObject({ interval: "month", cancelAtPeriodEnd: false, organizationName: expect.any(String) })
    expect((await get("/subscriptions?status=bogus", admin.jar)).status).toBe(400)
  })

  describe("audit log", () => {
    test("filters by workspace, actor, action and date range, newest first", async () => {
      const admin = await platformAdmin()
      const owner = await t.owner("audited")
      await post(`/organizations/${owner.orgId}/suspend`, admin.jar, { reason: "one" })
      await post(`/organizations/${owner.orgId}/unsuspend`, admin.jar)
      type Entries = { entries: { action: string; organizationId: string; actorId: string; actorEmail: string; createdAt: string }[]; nextCursor: string | null }
      const byOrg = (await get<Entries>(`/audit?organizationId=${owner.orgId}`, admin.jar)).body.entries
      expect(byOrg.map((e) => e.action)).toEqual(["workspace.unsuspended", "workspace.suspended"])
      expect(byOrg.every((e) => e.organizationId === owner.orgId && e.actorId === admin.id && e.actorEmail === admin.email)).toBe(true)
      expect((await get<Entries>(`/audit?actorId=${admin.id}&action=workspace.suspended`, admin.jar)).body.entries.map((e) => e.action)).toEqual(["workspace.suspended"])
      const later = new Date(Date.now() + 60_000).toISOString()
      expect((await get<Entries>(`/audit?organizationId=${owner.orgId}&from=${later}`, admin.jar)).body.entries).toEqual([])
      expect((await get<Entries>(`/audit?organizationId=${owner.orgId}&to=${later}`, admin.jar)).body.entries).toHaveLength(2)
    })

    test("pages of 50 with a next cursor", async () => {
      const admin = await platformAdmin()
      const owner = await t.owner("paged")
      await t.db.insert(auditLogs).values(Array.from({ length: 51 }, (_, i) => ({ organizationId: owner.orgId, actorId: admin.id, action: "member.invited", targetType: "invitation", targetId: `i${i}`, createdAt: new Date(Date.now() - i * 1000) })))
      type Entries = { entries: { targetId: string }[]; nextCursor: string | null }
      const first = (await get<Entries>(`/audit?organizationId=${owner.orgId}`, admin.jar)).body
      expect(first.entries).toHaveLength(50)
      expect(first.entries[0]!.targetId).toBe("i0")
      const second = (await get<Entries>(`/audit?organizationId=${owner.orgId}&cursor=${first.nextCursor}`, admin.jar)).body
      expect(second.entries.map((e) => e.targetId)).toEqual(["i50"])
      expect(second.nextCursor).toBeNull()
    })

    test("no route edits or deletes an entry", async () => {
      const routes = t.app.routes.filter((r) => r.path.startsWith("/api/admin/audit"))
      expect([...new Set(routes.map((r) => r.method))]).toEqual(["GET"])
      expect(t.app.routes.some((r) => /audit/.test(r.path) && ["DELETE", "PATCH", "PUT", "POST"].includes(r.method))).toBe(false)
    })
  })
})
