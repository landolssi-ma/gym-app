import { can, isLive, limitOf, meterOf, upgradeRequired, type Feature, type Limit, type UpgradeRequired } from "@workspace/billing"
import { and, eq, gt, invitation, member, organization, projects, sql, usage, type Db } from "@workspace/db"
import type { MiddlewareHandler } from "hono"

import type { GuardEnv } from "./guards"
import type { Tx } from "./rate-limit"
import { loadSubscription, type Subscription } from "./subscriptions"

// How each count limit is counted. Seats are members plus pending, unexpired invitations.
export const LIMIT_COUNTERS: Record<Limit, (db: Db | Tx, orgId: string) => Promise<number>> = {
  async seats(db, orgId) {
    const [[m], [i]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(member).where(eq(member.organizationId, orgId)),
      db.select({ n: sql<number>`count(*)::int` }).from(invitation).where(and(eq(invitation.organizationId, orgId), eq(invitation.status, "pending"), gt(invitation.expiresAt, new Date()))),
    ])
    return (m?.n ?? 0) + (i?.n ?? 0)
  },
  async projects(db, orgId) {
    const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(projects).where(eq(projects.organizationId, orgId))
    return row?.n ?? 0
  },
}

// Checks room for `adding` more of `limit` inside the caller's write transaction. Locking the
// workspace row serializes concurrent writers, so two requests can never both take the last unit.
export async function checkCountLimit(tx: Tx, sub: Subscription | null, orgId: string, limit: Limit, adding = 1): Promise<UpgradeRequired | null> {
  if (!sub || !isLive(sub.status)) return upgradeRequired("subscription_inactive")
  await tx.execute(sql`select 1 from ${organization} where ${organization.id} = ${orgId} for update`)
  const max = limitOf(sub.plan, limit)
  if (max === null) return null
  const used = await LIMIT_COUNTERS[limit](tx, orgId)
  return used + adding > max ? upgradeRequired(limit, { used, limit: max }) : null
}

// Counts one unit of `meter` for the current billing period, and refuses (without counting) once the
// plan's allowance is used. One INSERT ... ON CONFLICT DO UPDATE ... WHERE: increment and check are
// a single statement, so concurrent requests cannot both pass on the last unit.
export async function useMeter(db: Db | Tx, sub: Subscription | null, orgId: string, meter: string): Promise<UpgradeRequired | null> {
  if (!sub || !isLive(sub.status)) return upgradeRequired("subscription_inactive")
  const max = meterOf(sub.plan, meter)
  if (max === undefined) return null
  if (max < 1) return upgradeRequired(meter, { used: 0, limit: max })
  const [row] = await db
    .insert(usage)
    .values({ organizationId: orgId, meter, periodStart: sub.currentPeriodStart, count: 1 })
    .onConflictDoUpdate({ target: [usage.organizationId, usage.meter, usage.periodStart], set: { count: sql`${usage.count} + 1` }, setWhere: sql`${usage.count} < ${max}` })
    .returning({ count: usage.count })
  return row ? null : upgradeRequired(meter, { used: max, limit: max })
}

// Product routes need a live subscription: 402 subscription_inactive otherwise.
export const requireLiveSubscription: MiddlewareHandler<GuardEnv> = async (c, next) => {
  const sub = await loadSubscription(c.var.deps.db, c.var.orgId)
  if (!sub || !isLive(sub.status)) return c.json(upgradeRequired("subscription_inactive"), 402)
  await next()
}

export function requireFeature(feature: Feature): MiddlewareHandler<GuardEnv> {
  return async (c, next) => {
    const sub = await loadSubscription(c.var.deps.db, c.var.orgId)
    const refusal = can(sub, feature)
    if (refusal) return c.json(refusal, 402)
    await next()
  }
}
