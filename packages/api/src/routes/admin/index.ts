import { Hono } from "hono"
import { z } from "zod"

import { PLAN_IDS } from "@workspace/billing"
import { and, auditLogs, desc, eq, gte, lt, organization, subscriptions, user } from "@workspace/db"

import { requireAdmin, requireUser, type GuardEnv } from "../../guards"
import { valid } from "../../validate"
import { adminOrganizations } from "./organizations"
import { decodeCursor, PAGE_SIZE, pageOf } from "./page"
import { adminUsers } from "./users"

const STATUSES = ["trialing", "active", "past_due", "canceled", "ended"] as const

// The platform admin backoffice. requireAdmin re-reads the role from the database on every request,
// so a removed role takes effect on the next one. Nothing here edits or deletes an audit entry.
export const admin = new Hono<GuardEnv>()
  .use(requireUser, requireAdmin)
  // 204 for a platform admin: the backoffice layout asks this before rendering anything.
  .get("/check", (c) => c.body(null, 204))
  .route("/users", adminUsers)
  .route("/organizations", adminOrganizations)
  .get("/subscriptions", valid("query", z.object({ status: z.enum(STATUSES).optional(), plan: z.enum(PLAN_IDS as [string]).optional(), cursor: z.string().optional() })), async (c) => {
    const { status, plan, cursor } = c.req.valid("query")
    const offset = decodeCursor(cursor)
    const rows = await c.var.deps.db
      .select({
        organizationId: subscriptions.organizationId,
        organizationName: organization.name,
        plan: subscriptions.plan,
        interval: subscriptions.interval,
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      })
      .from(subscriptions)
      .innerJoin(organization, eq(organization.id, subscriptions.organizationId))
      .where(and(status ? eq(subscriptions.status, status) : undefined, plan ? eq(subscriptions.plan, plan) : undefined))
      .orderBy(desc(subscriptions.createdAt), desc(subscriptions.id))
      .limit(PAGE_SIZE + 1)
      .offset(offset)
    const { items, nextCursor } = pageOf(rows, offset)
    return c.json({ subscriptions: items, nextCursor })
  })
  // Newest first; every filter optional. `to` is exclusive.
  .get(
    "/audit",
    valid("query", z.object({ organizationId: z.string().optional(), actorId: z.string().optional(), action: z.string().optional(), from: z.iso.datetime().optional(), to: z.iso.datetime().optional(), cursor: z.string().optional() })),
    async (c) => {
      const q = c.req.valid("query")
      const offset = decodeCursor(q.cursor)
      const filters = and(
        q.organizationId ? eq(auditLogs.organizationId, q.organizationId) : undefined,
        q.actorId ? eq(auditLogs.actorId, q.actorId) : undefined,
        q.action ? eq(auditLogs.action, q.action) : undefined,
        q.from ? gte(auditLogs.createdAt, new Date(q.from)) : undefined,
        q.to ? lt(auditLogs.createdAt, new Date(q.to)) : undefined,
      )
      const rows = await c.var.deps.db
        .select({
          id: auditLogs.id,
          createdAt: auditLogs.createdAt,
          action: auditLogs.action,
          organizationId: auditLogs.organizationId,
          actorId: auditLogs.actorId,
          actorEmail: user.email,
          impersonatorId: auditLogs.impersonatorId,
          targetType: auditLogs.targetType,
          targetId: auditLogs.targetId,
          metadata: auditLogs.metadata,
          ip: auditLogs.ip,
        })
        .from(auditLogs)
        .leftJoin(user, eq(user.id, auditLogs.actorId))
        .where(filters)
        .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
        .limit(PAGE_SIZE + 1)
        .offset(offset)
      const { items, nextCursor } = pageOf(rows, offset)
      return c.json({ entries: items, nextCursor })
    },
  )
