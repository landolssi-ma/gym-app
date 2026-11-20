import { afterAll, describe, expect, test } from "vitest"

import { and, eq, invitation, member } from "@workspace/db"
import { TEST_PG_URL } from "@workspace/db/testing"

import { createPgApp } from "./helpers/pg-app"

type Team = { members: { id: string; userId: string; role: string; email: string }[]; invitations: { id: string; email: string; role: string }[]; role: string }

describe.skipIf(!TEST_PG_URL)("team routes against real Postgres", () => {
  const t = TEST_PG_URL ? createPgApp() : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  const team = async (cookie: string) => (await (await t.call("/api/team", { cookie })).json()) as Team
  const post = (path: string, cookie: string, body: unknown = {}) => t.call(path, { method: "POST", body, cookie })

  // An owner and a joined member with the given role.
  async function workspaceWith(role: "admin" | "member" = "member") {
    const { email: ownerEmail, jar: owner } = await t.owner()
    const memberEmail = t.email(role)
    const invited = (await (await post("/api/team/invites", owner, { email: memberEmail, role })).json()) as { id: string; organizationId: string }
    const joined = await t.signIn(memberEmail)
    expect((await post(`/api/team/invites/${invited.id}/accept`, joined)).status).toBe(200)
    const members = (await team(owner)).members
    return { owner, joined, orgId: invited.organizationId, ownerMember: members.find((m) => m.email === ownerEmail)!, joinedMember: members.find((m) => m.email === memberEmail)! }
  }

  test("an invitation emails an accept link and expires 48 hours after it is sent", async () => {
    const { jar: owner } = await t.owner("inviter")
    const email = t.email("bob")
    const res = await post("/api/team/invites", owner, { email })
    expect(res.status).toBe(201)
    const { id } = (await res.json()) as { id: string }
    expect(t.links.find((l) => l.kind === "invite" && l.email === email)?.url).toBe(`https://app.test/team/accept/${id}`)
    const [row] = await t.db.select({ expiresAt: invitation.expiresAt }).from(invitation).where(eq(invitation.id, id))
    expect(Math.round((row!.expiresAt.getTime() - Date.now()) / 3_600_000)).toBe(48)
    expect((await team(owner)).invitations.map((i) => i.email)).toEqual([email])
    // The owner plus the pending invitation, of the Pro plan's 5 seats.
    expect(((await team(owner)) as unknown as { seats: unknown }).seats).toEqual({ used: 2, limit: 5 })
  })

  test("accepting makes the invitee a member with the invited role and the workspace active", async () => {
    const { joined, orgId, joinedMember } = await workspaceWith("admin")
    expect(joinedMember.role).toBe("admin")
    expect(((await (await t.call("/api/organizations", { cookie: joined })).json()) as { activeId: string }).activeId).toBe(orgId)
  })

  test("accepting while signed in with another email is 403 wrong_email and creates no membership", async () => {
    const { jar: owner } = await t.owner("o")
    const { id, organizationId } = (await (await post("/api/team/invites", owner, { email: t.email("bob") })).json()) as { id: string; organizationId: string }
    const carol = await t.signIn(t.email("carol"))
    const res = await post(`/api/team/invites/${id}/accept`, carol)
    expect([res.status, await res.json()]).toEqual([403, { error: "wrong_email" }])
    expect(await t.db.select().from(member).where(eq(member.organizationId, organizationId))).toHaveLength(1)
  })

  test("a revoked invitation can no longer be accepted", async () => {
    const { jar: owner } = await t.owner("o")
    const email = t.email("revoked")
    const { id } = (await (await post("/api/team/invites", owner, { email })).json()) as { id: string }
    expect((await t.call(`/api/team/invites/${id}`, { method: "DELETE", cookie: owner })).status).toBe(200)
    expect((await post(`/api/team/invites/${id}/accept`, await t.signIn(email))).ok).toBe(false)
  })

  test("an expired invitation can no longer be accepted", async () => {
    const { jar: owner } = await t.owner("o")
    const email = t.email("late")
    const { id } = (await (await post("/api/team/invites", owner, { email })).json()) as { id: string }
    await t.db.update(invitation).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(invitation.id, id))
    expect((await post(`/api/team/invites/${id}/accept`, await t.signIn(email))).ok).toBe(false)
  })

  test("inviting an existing member is 409 already_member", async () => {
    const { owner, joinedMember } = await workspaceWith()
    const res = await post("/api/team/invites", owner, { email: joinedMember.email })
    expect([res.status, await res.json()]).toEqual([409, { error: "already_member" }])
  })

  test("a member cannot invite: 403 forbidden and no invitation", async () => {
    const { joined, orgId } = await workspaceWith("member")
    const res = await post("/api/team/invites", joined, { email: t.email("x") })
    expect([res.status, await res.json()]).toEqual([403, { error: "forbidden" }])
    expect(await t.db.select().from(invitation).where(and(eq(invitation.organizationId, orgId), eq(invitation.status, "pending")))).toHaveLength(0)
  })

  test("an admin can invite and change a member's role", async () => {
    const { owner, joined: admin } = await workspaceWith("admin")
    expect((await post("/api/team/invites", admin, { email: t.email("byadmin") })).status).toBe(201)
    const email = t.email("promoted")
    const { id } = (await (await post("/api/team/invites", owner, { email })).json()) as { id: string }
    await post(`/api/team/invites/${id}/accept`, await t.signIn(email))
    const target = (await team(owner)).members.find((m) => m.email === email)!
    expect((await t.call(`/api/team/members/${target.id}`, { method: "PATCH", body: { role: "admin" }, cookie: admin })).status).toBe(200)
    expect((await team(owner)).members.find((m) => m.email === email)!.role).toBe("admin")
  })

  test("an admin cannot remove the owner or change the owner's role; nobody can set owner", async () => {
    const { joined: admin, ownerMember, joinedMember } = await workspaceWith("admin")
    expect((await t.call(`/api/team/members/${ownerMember.id}`, { method: "DELETE", cookie: admin })).status).toBe(403)
    expect((await t.call(`/api/team/members/${ownerMember.id}`, { method: "PATCH", body: { role: "member" }, cookie: admin })).status).toBe(403)
    expect((await t.call(`/api/team/members/${joinedMember.id}`, { method: "PATCH", body: { role: "owner" }, cookie: admin })).status).toBe(400)
  })

  test("the owner cannot leave: 409 only_owner", async () => {
    const owner = await t.signIn(t.email("alone"))
    const res = await post("/api/team/leave", owner)
    expect([res.status, await res.json()]).toEqual([409, { error: "only_owner" }])
  })

  test("a member who leaves loses access and moves to another workspace", async () => {
    const { joined, orgId } = await workspaceWith()
    const res = await post("/api/team/leave", joined)
    expect(res.status).toBe(200)
    const { activeId } = (await res.json()) as { activeId: string }
    expect(activeId).not.toBe(orgId)
    expect(((await (await t.call("/api/organizations", { cookie: joined })).json()) as { organizations: { id: string }[] }).organizations.map((o) => o.id)).not.toContain(orgId)
  })

  test("a removed member loses access on the next request", async () => {
    const { owner, joined, orgId, joinedMember } = await workspaceWith()
    expect((await t.call(`/api/team/members/${joinedMember.id}`, { method: "DELETE", cookie: owner })).status).toBe(200)
    const after = (await (await t.call("/api/organizations", { cookie: joined })).json()) as { activeId: string | null }
    expect(after.activeId).not.toBe(orgId)
    expect((await team(joined)).members.map((m) => m.id)).not.toContain(joinedMember.id)
  })

  test("transfer: the member becomes owner and the previous owner becomes admin, in one step", async () => {
    const { owner, joined, ownerMember, joinedMember } = await workspaceWith()
    expect((await post("/api/team/transfer-ownership", owner, { memberId: joinedMember.id })).status).toBe(200)
    const roles = Object.fromEntries((await team(joined)).members.map((m) => [m.id, m.role]))
    expect(roles).toEqual({ [ownerMember.id]: "admin", [joinedMember.id]: "owner" })
  })

  test("transfer to someone who is not a member is 404", async () => {
    const { jar: owner } = await t.owner("o")
    const res = await post("/api/team/transfer-ownership", owner, { memberId: "not-a-member" })
    expect([res.status, await res.json()]).toEqual([404, { error: "not_found" }])
  })

  test("only the owner can transfer ownership", async () => {
    const { joined: admin, joinedMember } = await workspaceWith("admin")
    expect((await post("/api/team/transfer-ownership", admin, { memberId: joinedMember.id })).status).toBe(403)
  })
})
