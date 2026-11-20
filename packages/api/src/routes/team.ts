import { Hono, type Context } from "hono"
import { z } from "zod"

import { MemberError, OrgError } from "@workspace/auth"
import { eq, invitation, organization } from "@workspace/db"

import { forbidWhileImpersonating, requireActiveOrg, requireOrgRole, requireUser, type GuardEnv } from "../guards"
import { PLANS } from "@workspace/billing"

import { auditActor, writeAudit } from "../audit"
import { LIMIT_COUNTERS } from "../entitlements"
import { loadSubscription } from "../subscriptions"
import { acceptInvitation, createInvitation, pendingInvitations, revokeInvitation } from "../invitations"
import { json } from "../validate"

const STATUS = { not_found: 404, invalid_invitation: 404, forbidden: 403, wrong_email: 403, only_owner: 409, already_member: 409, already_invited: 409 } as const

// Workspace and member errors become their own codes; anything else is a bug and reaches the error handler.
async function mapped(c: Context<GuardEnv>, run: () => Promise<Response>): Promise<Response> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof OrgError || err instanceof MemberError)) throw err
    const status = STATUS[err.code as keyof typeof STATUS]
    if (!status) throw err
    return c.json({ error: err.code }, status)
  }
}

const manage = [forbidWhileImpersonating, requireActiveOrg, requireOrgRole("owner", "admin")] as const

export const team = new Hono<GuardEnv>()
  .use(requireUser)
  .get("/", requireActiveOrg, async (c) => {
    const { deps, orgId, orgRole } = c.var
    const [members, invitations, used, sub] = await Promise.all([deps.auth.listMembers(orgId), pendingInvitations(deps.db, orgId), LIMIT_COUNTERS.seats(deps.db, orgId), loadSubscription(deps.db, orgId)])
    return c.json({ members, invitations, role: orgRole, seats: { used, limit: sub ? PLANS[sub.plan].limits.seats : 0 } })
  })
  .post("/invites", ...manage, json(z.object({ email: z.email(), role: z.enum(["admin", "member"]).default("member") })), (c) =>
    mapped(c, async () => {
      const { deps, orgId, org, session } = c.var
      const { email, role } = c.req.valid("json")
      const result = await createInvitation(deps.db, { orgId, inviterId: c.var.userId, email: email.toLowerCase(), role }, (tx, inv) =>
        writeAudit(tx, auditActor(c), { organizationId: orgId, action: "member.invited", targetType: "invitation", targetId: inv.id, metadata: { email: inv.email, role } }),
      )
      if ("refusal" in result) return c.json(result.refusal, 402)
      // After commit: the invitation exists even if the email fails, and can be resent.
      await deps.mail.send("teamInvite", result.invitation.email, { inviterName: session.user.name, organizationName: org.name, acceptUrl: `${deps.config.appOrigin}/team/accept/${result.invitation.id}` })
      return c.json(result.invitation, 201)
    }),
  )
  .delete("/invites/:id", ...manage, (c) =>
    mapped(c, async () => {
      // Only pending invitations of the active workspace.
      return (await revokeInvitation(c.var.deps.db, c.var.orgId, c.req.param("id"))) ? c.json({ ok: true }) : c.json({ error: "not_found" }, 404)
    }),
  )
  // Not behind requireActiveOrg: the invitee is usually not a member of anything they could use yet.
  .post("/invites/:id/accept", forbidWhileImpersonating, (c) =>
    mapped(c, async () => {
      const { db, auth } = c.var.deps
      const [row] = await db
        .select({ organizationId: invitation.organizationId, deletedAt: organization.deletedAt })
        .from(invitation)
        .innerJoin(organization, eq(organization.id, invitation.organizationId))
        .where(eq(invitation.id, c.req.param("id")))
      if (!row || row.deletedAt) return c.json({ error: "not_found" }, 404)
      const result = await acceptInvitation(db, { id: c.req.param("id"), userId: c.var.userId, email: c.var.session.user.email })
      if ("refusal" in result) return c.json(result.refusal, 402)
      await auth.setActiveOrganization(c.var.session, row.organizationId)
      return c.json({ organizationId: row.organizationId })
    }),
  )
  .delete("/members/:id", ...manage, (c) =>
    mapped(c, async () => {
      const { orgId } = c.var
      await c.var.deps.auth.removeMember(orgId, c.req.param("id"), (tx, target) =>
        writeAudit(tx, auditActor(c), { organizationId: orgId, action: "member.removed", targetType: "user", targetId: target.userId, metadata: { role: target.role } }),
      )
      return c.json({ ok: true })
    }),
  )
  .patch("/members/:id", ...manage, json(z.object({ role: z.enum(["admin", "member"]) })), (c) =>
    mapped(c, async () => {
      const { orgId } = c.var
      const { role } = c.req.valid("json")
      await c.var.deps.auth.setMemberRole(orgId, c.req.param("id"), role, (tx, target) =>
        writeAudit(tx, auditActor(c), { organizationId: orgId, action: "member.role_changed", targetType: "user", targetId: target.userId, metadata: { from: target.role, to: role } }),
      )
      return c.json({ ok: true })
    }),
  )
  .post("/leave", forbidWhileImpersonating, requireActiveOrg, (c) =>
    mapped(c, async () => {
      const next = await c.var.deps.auth.leaveOrganization(c.var.session, c.var.orgId)
      return c.json({ activeId: next.id })
    }),
  )
  .post("/transfer-ownership", forbidWhileImpersonating, requireActiveOrg, requireOrgRole("owner"), json(z.object({ memberId: z.string().min(1) })), (c) =>
    mapped(c, async () => {
      const { orgId } = c.var
      await c.var.deps.auth.transferOwnership(orgId, c.var.userId, c.req.valid("json").memberId, (tx, target) =>
        writeAudit(tx, auditActor(c), { organizationId: orgId, action: "ownership.transferred", targetType: "user", targetId: target.userId, metadata: { from: c.var.userId } }),
      )
      return c.json({ ok: true })
    }),
  )
