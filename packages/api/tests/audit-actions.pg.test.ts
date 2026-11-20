import { afterAll, describe, expect, test, vi } from "vitest"

import { and, auditLogs, eq, member, session, subscriptions, user } from "@workspace/db"
import { TEST_PG_URL } from "@workspace/db/testing"

import { testBilling } from "./helpers/billing"
import { createPgApp } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("audited actions against real Postgres", () => {
  const provider = { changePlan: vi.fn(async () => {}), scheduleCancel: vi.fn(async () => {}), resume: vi.fn(async () => {}), cancelImmediately: vi.fn(async () => {}) }
  const t = TEST_PG_URL ? createPgApp({ billing: testBilling(provider) }) : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  const call = (method: string, path: string, cookie: string, body: unknown = {}) => t.call(path, { method, cookie, body })
  const idOf = async (email: string) => (await t.db.select({ id: user.id }).from(user).where(eq(user.email, email)))[0]!.id
  const entries = (action: string, where: { organizationId?: string; targetId?: string }) =>
    t.db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.action, action), where.organizationId ? eq(auditLogs.organizationId, where.organizationId) : undefined, where.targetId ? eq(auditLogs.targetId, where.targetId) : undefined))

  async function platformAdmin() {
    const email = t.email("audit-admin")
    const jar = await t.signIn(email)
    await t.db.update(user).set({ role: "admin" }).where(eq(user.email, email))
    return { jar, id: await idOf(email) }
  }
  // An owner and a joined member of the owner's subscribed workspace.
  async function team() {
    const owner = await t.owner("audit-owner")
    const memberEmail = t.email("audit-member")
    const invite = (await (await call("POST", "/api/team/invites", owner.jar, { email: memberEmail, role: "member" })).json()) as { id: string }
    const joined = await t.signIn(memberEmail)
    await call("POST", `/api/team/invites/${invite.id}/accept`, joined)
    const memberUserId = await idOf(memberEmail)
    const [m] = await t.db.select({ id: member.id }).from(member).where(and(eq(member.organizationId, owner.orgId), eq(member.userId, memberUserId)))
    return { owner, ownerId: await idOf(owner.email), invite, memberEmail, memberUserId, memberId: m!.id, joined }
  }

  test("member invited", async () => {
    const { owner, ownerId, invite, memberEmail } = await team()
    expect(await entries("member.invited", { organizationId: owner.orgId })).toEqual([
      expect.objectContaining({ actorId: ownerId, impersonatorId: null, targetType: "invitation", targetId: invite.id, metadata: { email: memberEmail, role: "member" } }),
    ])
  })

  test("member removed: one entry with the remover as actor and the removed user as target", async () => {
    const { owner, ownerId, memberId, memberUserId } = await team()
    expect((await call("DELETE", `/api/team/members/${memberId}`, owner.jar)).status).toBe(200)
    expect(await entries("member.removed", { organizationId: owner.orgId })).toEqual([expect.objectContaining({ actorId: ownerId, targetType: "user", targetId: memberUserId })])
  })

  test("member role changed, with the previous and new role", async () => {
    const { owner, memberId, memberUserId } = await team()
    await call("PATCH", `/api/team/members/${memberId}`, owner.jar, { role: "admin" })
    expect(await entries("member.role_changed", { organizationId: owner.orgId })).toEqual([expect.objectContaining({ targetId: memberUserId, metadata: { from: "member", to: "admin" } })])
  })

  test("a refused role change writes no entry", async () => {
    const { owner, joined, ownerId } = await team()
    const [ownerMember] = await t.db.select({ id: member.id }).from(member).where(and(eq(member.organizationId, owner.orgId), eq(member.userId, ownerId)))
    await call("PATCH", `/api/team/members/${ownerMember!.id}`, owner.jar, { role: "member" })
    await call("PATCH", `/api/team/members/${ownerMember!.id}`, joined, { role: "member" })
    expect(await entries("member.role_changed", { organizationId: owner.orgId })).toEqual([])
  })

  test("ownership transferred", async () => {
    const { owner, ownerId, memberId, memberUserId } = await team()
    expect((await call("POST", "/api/team/transfer-ownership", owner.jar, { memberId })).status).toBe(200)
    expect(await entries("ownership.transferred", { organizationId: owner.orgId })).toEqual([expect.objectContaining({ actorId: ownerId, targetId: memberUserId, metadata: { from: ownerId } })])
  })

  test("workspace created and deleted", async () => {
    const jar = await t.signIn(t.email("audit-ws"))
    const { id } = (await (await call("POST", "/api/organizations", jar, { name: "Audited" })).json()) as { id: string }
    expect(await entries("workspace.created", { organizationId: id })).toHaveLength(1)
    await call("POST", "/api/organizations/current/delete", jar, { confirm: "Audited" })
    expect(await entries("workspace.deleted", { organizationId: id })).toHaveLength(1)
  })

  test("workspace suspended with the reason, and unsuspended, naming the admin", async () => {
    const admin = await platformAdmin()
    const owner = await t.owner("audit-suspend")
    await call("POST", `/api/admin/organizations/${owner.orgId}/suspend`, admin.jar, { reason: "fraud" })
    await call("POST", `/api/admin/organizations/${owner.orgId}/unsuspend`, admin.jar)
    expect(await entries("workspace.suspended", { organizationId: owner.orgId })).toEqual([expect.objectContaining({ actorId: admin.id, metadata: { reason: "fraud" } })])
    expect(await entries("workspace.unsuspended", { organizationId: owner.orgId })).toEqual([expect.objectContaining({ actorId: admin.id })])
  })

  test("user banned: no workspace, the user as target, the reason in the details; unbanned", async () => {
    const admin = await platformAdmin()
    const email = t.email("audit-ban")
    await t.signIn(email)
    const id = await idOf(email)
    await call("POST", `/api/admin/users/${id}/ban`, admin.jar, { reason: "abuse" })
    expect(await entries("user.banned", { targetId: id })).toEqual([expect.objectContaining({ organizationId: null, actorId: admin.id, targetType: "user", metadata: { reason: "abuse", expiresAt: null } })])
    await call("POST", `/api/admin/users/${id}/unban`, admin.jar)
    expect(await entries("user.unbanned", { targetId: id })).toEqual([expect.objectContaining({ organizationId: null, actorId: admin.id })])
  })

  test("session revoked by an admin", async () => {
    const admin = await platformAdmin()
    const email = t.email("audit-revoke")
    await t.signIn(email)
    const id = await idOf(email)
    const [s] = await t.db.select({ id: session.id }).from(session).where(eq(session.userId, id))
    await call("POST", `/api/admin/users/${id}/sessions/${s!.id}/revoke`, admin.jar)
    expect(await entries("session.revoked", { targetId: s!.id })).toEqual([expect.objectContaining({ actorId: admin.id, metadata: { userId: id } })])
  })

  test("plan changed, with the previous and new plan; canceled; resumed", async () => {
    const owner = await t.owner("audit-billing", "pro")
    await call("POST", "/api/billing/change-plan", owner.jar, { plan: "business", interval: "month" })
    expect(await entries("subscription.plan_changed", { organizationId: owner.orgId })).toEqual([
      expect.objectContaining({ metadata: { from: { plan: "pro", interval: "month" }, to: { plan: "business", interval: "month" }, when: "now" } }),
    ])
    await call("POST", "/api/billing/cancel", owner.jar)
    expect(await entries("subscription.canceled", { organizationId: owner.orgId })).toHaveLength(1)
    await t.db.update(subscriptions).set({ cancelAtPeriodEnd: true }).where(eq(subscriptions.organizationId, owner.orgId))
    await call("POST", "/api/billing/resume", owner.jar)
    expect(await entries("subscription.resumed", { organizationId: owner.orgId })).toHaveLength(1)
  })

  test("a provider failure leaves no plan changed entry", async () => {
    const owner = await t.owner("audit-provider-fail", "pro")
    provider.changePlan.mockRejectedValueOnce(new Error("provider down"))
    expect((await call("POST", "/api/billing/change-plan", owner.jar, { plan: "business", interval: "month" })).status).toBe(500)
    expect(await entries("subscription.plan_changed", { organizationId: owner.orgId })).toEqual([])
  })

  test("an action taken while impersonating names the user as actor and the admin as impersonator", async () => {
    const admin = await platformAdmin()
    const email = t.email("audit-impersonated")
    await t.signIn(email)
    const userId = await idOf(email)
    const jar = t.jarFrom(await call("POST", "/api/auth/admin/impersonate-user", admin.jar, { userId }))
    const { id } = (await (await call("POST", "/api/organizations", jar, { name: "On behalf" })).json()) as { id: string }
    expect(await entries("workspace.created", { organizationId: id })).toEqual([expect.objectContaining({ actorId: userId, impersonatorId: admin.id })])
  })
})
