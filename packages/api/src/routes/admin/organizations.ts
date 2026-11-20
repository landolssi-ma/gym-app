import { Hono } from "hono"
import { z } from "zod"

import { desc, eq, ilike, inArray, member, or, organization, subscriptions, user } from "@workspace/db"

import { auditActor, writeAudit, type AuditActor } from "../../audit"
import type { GuardEnv } from "../../guards"
import { json, valid } from "../../validate"
import { decodeCursor, PAGE_SIZE, pageOf } from "./page"

export const adminOrganizations = new Hono<GuardEnv>()
  // Search by part of the name or the exact id; an empty search lists every workspace, newest first.
  .get("/", valid("query", z.object({ q: z.string().optional(), cursor: z.string().optional() })), async (c) => {
    const { db } = c.var.deps
    const { q, cursor } = c.req.valid("query")
    const query = q?.trim()
    const offset = decodeCursor(cursor)
    const rows = await db
      .select({ id: organization.id, name: organization.name, suspended: organization.suspended, deletedAt: organization.deletedAt, createdAt: organization.createdAt, plan: subscriptions.plan, status: subscriptions.status })
      .from(organization)
      .leftJoin(subscriptions, eq(subscriptions.organizationId, organization.id))
      .where(query ? or(ilike(organization.name, `%${query}%`), eq(organization.id, query)) : undefined)
      .orderBy(desc(organization.createdAt), desc(organization.id))
      .limit(PAGE_SIZE + 1)
      .offset(offset)
    const { items, nextCursor } = pageOf(rows, offset)
    // Owner email and member count for this page only.
    const ids = items.map((o) => o.id)
    const members = ids.length ? await db.select({ organizationId: member.organizationId, role: member.role, email: user.email }).from(member).innerJoin(user, eq(user.id, member.userId)).where(inArray(member.organizationId, ids)) : []
    return c.json({
      organizations: items.map((o) => ({
        ...o,
        ownerEmail: members.find((m) => m.organizationId === o.id && m.role === "owner")?.email ?? null,
        memberCount: members.filter((m) => m.organizationId === o.id).length,
      })),
      nextCursor,
    })
  })
  .get("/:id", async (c) => {
    const { db } = c.var.deps
    const id = c.req.param("id")
    const [org] = await db.select({ id: organization.id, name: organization.name, logo: organization.logo, suspended: organization.suspended, deletedAt: organization.deletedAt, createdAt: organization.createdAt }).from(organization).where(eq(organization.id, id))
    if (!org) return c.json({ error: "not_found" }, 404)
    const [members, [sub]] = await Promise.all([
      db.select({ userId: member.userId, role: member.role, name: user.name, email: user.email }).from(member).innerJoin(user, eq(user.id, member.userId)).where(eq(member.organizationId, id)).orderBy(member.createdAt),
      db
        .select({ plan: subscriptions.plan, interval: subscriptions.interval, status: subscriptions.status, trialEndsAt: subscriptions.trialEndsAt, currentPeriodEnd: subscriptions.currentPeriodEnd, cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd })
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, id)),
    ])
    return c.json({ ...org, members, subscription: sub ?? null })
  })
  // Takes effect on the members' next request: every guard reads the workspace fresh.
  .post("/:id/suspend", json(z.object({ reason: z.string().trim().min(1).max(500) })), async (c) => {
    const id = c.req.param("id")
    return (await setSuspended(c.var.deps, auditActor(c), id, true, c.req.valid("json").reason)) ? c.json({ ok: true }) : c.json({ error: "not_found" }, 404)
  })
  .post("/:id/unsuspend", async (c) => {
    const id = c.req.param("id")
    return (await setSuspended(c.var.deps, auditActor(c), id, false)) ? c.json({ ok: true }) : c.json({ error: "not_found" }, 404)
  })

// The flag and its audit entry in one transaction; false when there is no such workspace.
function setSuspended(deps: GuardEnv["Variables"]["deps"], actor: AuditActor, id: string, suspended: boolean, reason?: string) {
  return deps.db.transaction(async (tx) => {
    const rows = await tx.update(organization).set({ suspended }).where(eq(organization.id, id)).returning({ id: organization.id })
    if (!rows.length) return false
    await writeAudit(tx, actor, { organizationId: id, action: suspended ? "workspace.suspended" : "workspace.unsuspended", targetType: "workspace", targetId: id, ...(reason && { metadata: { reason } }) })
    return true
  })
}
