import { afterAll, describe, expect, test, vi } from "vitest"

import { account, and, auditLogs, eq, session, user } from "@workspace/db"
import { TEST_PG_URL } from "@workspace/db/testing"

import { testBilling } from "./helpers/billing"
import { createPgApp } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("impersonation against real Postgres", () => {
  const provider = { createCheckout: vi.fn(async () => ({ url: "https://checkout.test" })), changePlan: vi.fn(async () => {}), scheduleCancel: vi.fn(async () => {}), resume: vi.fn(async () => {}), cancelImmediately: vi.fn(async () => {}) }
  const t = TEST_PG_URL ? createPgApp({ billing: testBilling(provider) }) : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  const idOf = async (email: string) => (await t.db.select({ id: user.id }).from(user).where(eq(user.email, email)))[0]!.id
  const impersonate = (cookie: string, userId: string) => t.call("/api/auth/admin/impersonate-user", { method: "POST", cookie, body: { userId } })

  async function setup() {
    const adminEmail = t.email("imp-admin")
    const admin = await t.signIn(adminEmail)
    await t.db.update(user).set({ role: "admin" }).where(eq(user.email, adminEmail))
    const victim = await t.owner("imp-victim")
    const victimId = await idOf(victim.email)
    const started = await impersonate(admin, victimId)
    expect(started.status).toBe(200)
    return { admin, adminId: await idOf(adminEmail), victim, victimId, jar: t.jarFrom(started) }
  }

  test("start: the app opens as the user, flagged as impersonated, for 1 hour, and is audited", async () => {
    const { jar, victim, victimId, adminId } = await setup()
    const me = (await (await t.call("/api/me", { cookie: jar })).json()) as { user: { email: string }; impersonating: boolean }
    expect(me).toMatchObject({ user: { email: victim.email }, impersonating: true })
    const [row] = await t.db.select({ expiresAt: session.expiresAt }).from(session).where(and(eq(session.userId, victimId), eq(session.impersonatedBy, adminId)))
    expect(Math.abs(row!.expiresAt.getTime() - Date.now() - 3_600_000)).toBeLessThan(60_000)
    expect(await t.db.select({ action: auditLogs.action, actorId: auditLogs.actorId, targetId: auditLogs.targetId, organizationId: auditLogs.organizationId }).from(auditLogs).where(eq(auditLogs.targetId, victimId))).toContainEqual({
      action: "impersonation.started",
      actorId: adminId,
      targetId: victimId,
      organizationId: null,
    })
  })

  test("impersonating another platform admin is refused", async () => {
    const { admin } = await setup()
    const otherEmail = t.email("imp-other-admin")
    await t.signIn(otherEmail)
    await t.db.update(user).set({ role: "admin" }).where(eq(user.email, otherEmail))
    expect((await impersonate(admin, await idOf(otherEmail))).status).toBe(403)
  })

  test("a regular user cannot impersonate", async () => {
    const victim = await t.owner("not-admin")
    const other = await t.owner("target")
    expect((await impersonate(victim.jar, await idOf(other.email))).status).toBe(403)
  })

  test("stop ends the impersonation, returns the admin to their own session, and is audited", async () => {
    const { jar, adminId, victimId } = await setup()
    const stopped = await t.call("/api/auth/admin/stop-impersonating", { method: "POST", cookie: jar, body: {} })
    expect(stopped.status).toBe(200)
    expect(await t.db.select().from(session).where(and(eq(session.userId, victimId), eq(session.impersonatedBy, adminId)))).toEqual([])
    const back = (await (await t.call("/api/me", { cookie: t.jarFrom(stopped) })).json()) as { user: { id: string }; impersonating: boolean }
    expect(back).toMatchObject({ user: { id: adminId }, impersonating: false })
    expect((await t.db.select({ action: auditLogs.action }).from(auditLogs).where(and(eq(auditLogs.actorId, adminId), eq(auditLogs.targetId, victimId)))).map((r) => r.action)).toContain("impersonation.stopped")
  })

  // Every route the admin-backoffice spec lists: credentials, sessions, membership, billing, deletion.
  const ROUTES: [string, string, unknown?][] = [
    ["POST", "/api/auth/change-password", { currentPassword: "x", newPassword: "a-much-longer-password-1" }],
    ["POST", "/api/auth/change-email", { newEmail: "new@test.invalid" }],
    ["POST", "/api/auth/delete-user", {}],
    ["POST", "/api/auth/revoke-sessions", {}],
    ["POST", "/api/auth/revoke-other-sessions", {}],
    ["POST", "/api/auth/revoke-session", { token: "x" }],
    ["DELETE", "/api/account/sessions/s1"],
    ["POST", "/api/account/delete", { confirm: "x" }],
    ["POST", "/api/team/invites", { email: "someone@test.invalid" }],
    ["DELETE", "/api/team/invites/i1"],
    ["POST", "/api/team/invites/i1/accept"],
    ["DELETE", "/api/team/members/m1"],
    ["PATCH", "/api/team/members/m1", { role: "admin" }],
    ["POST", "/api/team/leave"],
    ["POST", "/api/team/transfer-ownership", { memberId: "m1" }],
    ["POST", "/api/billing/checkout", { plan: "pro", interval: "month" }],
    ["POST", "/api/billing/change-plan", { plan: "business", interval: "month" }],
    ["POST", "/api/billing/cancel"],
    ["POST", "/api/billing/resume"],
    ["POST", "/api/billing/portal"],
    ["POST", "/api/organizations/current/delete", { confirm: "x" }],
  ]
  test.each(ROUTES)("%s %s is 403 impersonating", async (method, path, body) => {
    const { jar } = await setup()
    const res = await t.call(path, { method, cookie: jar, body: body ?? {} })
    expect([res.status, await res.json()]).toEqual([403, { error: "impersonating" }])
  })

  test("a password change while impersonating leaves the password unchanged; sign out everywhere revokes nothing", async () => {
    const { jar, victimId, victim } = await setup()
    const before = await t.db.select({ password: account.password }).from(account).where(eq(account.userId, victimId))
    await t.call("/api/auth/change-password", { method: "POST", cookie: jar, body: { currentPassword: "x", newPassword: "a-much-longer-password-1" } })
    expect(await t.db.select({ password: account.password }).from(account).where(eq(account.userId, victimId))).toEqual(before)
    await t.call("/api/auth/revoke-sessions", { method: "POST", cookie: jar, body: {} })
    expect((await t.call("/api/me", { cookie: victim.jar })).status).toBe(200)
    expect(Object.values(provider).every((f) => f.mock.calls.length === 0)).toBe(true)
  })
})
