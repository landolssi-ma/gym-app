import { Hono } from "hono"
import { z } from "zod"

import { loadSubscription } from "../subscriptions"
import { eq, organization } from "@workspace/db"

import { auditActor, writeAudit, type AuditActor } from "../audit"
import { forbidWhileImpersonating, requireActiveOrg, requireActiveOrgAllowSuspended, requireOrgRole, requireUser, type GuardEnv } from "../guards"
import { json } from "../validate"

// The signed-in user's workspaces. Not behind requireActiveOrg: a member of a suspended or deleted
// workspace must still be able to list and switch away.
export const organizations = new Hono<GuardEnv>()
  .use(requireUser)
  .get("/", async (c) => {
    const { auth } = c.var.deps
    const [orgs, active] = await Promise.all([auth.listOrganizations(c.var.userId), auth.getActiveOrganization(c.var.session)])
    return c.json({ organizations: orgs, activeId: active?.id ?? null })
  })
  .post("/", json(z.object({ name: z.string().trim().min(1).max(80) })), async (c) => {
    const { auth, jobs } = c.var.deps
    const org = await auth.createOrganization(c.var.session.user, c.req.valid("json").name, (tx, created) =>
      writeAudit(tx, auditActor(c), { organizationId: created.id, action: "workspace.created", targetType: "workspace", targetId: created.id, metadata: { name: created.name } }),
    )
    await auth.setActiveOrganization(c.var.session, org.id)
    await jobs.send("organization.created", { organizationId: org.id }, `organization.created:${org.id}`)
    return c.json(org, 201)
  })
  .post("/:id/switch", async (c) => {
    const { auth } = c.var.deps
    const id = c.req.param("id")
    // Ids of workspaces the user does not belong to are indistinguishable from unknown ids.
    if (!(await auth.listOrganizations(c.var.userId)).some((o) => o.id === id)) return c.json({ error: "not_found" }, 404)
    await auth.setActiveOrganization(c.var.session, id)
    return c.json({ activeId: id })
  })
  .patch("/current", requireActiveOrg, requireOrgRole("owner", "admin"), json(z.object({ name: z.string().trim().min(1).max(80) })), async (c) => {
    await c.var.deps.db.update(organization).set({ name: c.req.valid("json").name }).where(eq(organization.id, c.var.orgId))
    return c.json({ ok: true })
  })
  .post("/current/delete", forbidWhileImpersonating, requireActiveOrgAllowSuspended, requireOrgRole("owner"), json(z.object({ confirm: z.string() })), async (c) => {
    // Exact match, no normalization: the typed name must be the workspace's name.
    if (c.req.valid("json").confirm !== c.var.org.name) return c.json({ error: "confirm_mismatch" }, 400)
    await deleteOrganization(c.var.deps, c.var.orgId, auditActor(c))
    const next = await c.var.deps.auth.getActiveOrganization(c.var.session)
    return c.json({ activeId: next?.id ?? null })
  })

// Deletes the active workspace: unreachable at once, purged after 30 days. Members who had it active
// move to another workspace on their next request.
export async function deleteOrganization(deps: GuardEnv["Variables"]["deps"], orgId: string, actor: AuditActor): Promise<void> {
  await deps.auth.softDeleteOrganization(orgId, (tx) => writeAudit(tx, actor, { organizationId: orgId, action: "workspace.deleted", targetType: "workspace", targetId: orgId }))
  // No further charge. The workspace is already gone for its members, so a provider failure is logged, not fatal.
  const sub = await loadSubscription(deps.db, orgId)
  if (sub && sub.status !== "canceled" && sub.status !== "ended")
    await deps.billing.cancelImmediately(sub.providerSubscriptionId).catch((err: unknown) => deps.log.error("cancel_on_delete_failed", { err, orgId }))
  await deps.jobs.send("organization.deleted", { organizationId: orgId }, `organization.deleted:${orgId}`)
}

