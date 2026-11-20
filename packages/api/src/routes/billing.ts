import { Hono } from "hono"
import { z } from "zod"

import { INTERVALS, isLive, PLAN_IDS, PLANS, type Interval, type Limit, type PlanId } from "@workspace/billing"
import { and, eq, usage } from "@workspace/db"

import { auditActor, writeAudit } from "../audit"
import { LIMIT_COUNTERS } from "../entitlements"
import { forbidWhileImpersonating, requireActiveOrgAllowSuspended, requireOrgRole, requireUser, type GuardEnv } from "../guards"
import { loadSubscription } from "../subscriptions"
import { json } from "../validate"

const PlanBody = z.object({ plan: z.enum(PLAN_IDS as [PlanId, ...PlanId[]]), interval: z.enum(INTERVALS) })
// The webhook is the only writer of the subscription row; these routes ask the provider and return.
const owner = [requireOrgRole("owner")] as const
const ownerWrite = [forbidWhileImpersonating, requireOrgRole("owner")] as const

// Price per month, to compare plans across intervals.
const monthly = (plan: PlanId, interval: Interval) => PLANS[plan].priceUsd[interval] / (interval === "year" ? 12 : 1)

// The first limit the workspace's current usage would exceed on `plan`, or null.
async function exceededLimit(db: GuardEnv["Variables"]["deps"]["db"], orgId: string, plan: PlanId): Promise<Limit | null> {
  for (const [limit, count] of Object.entries(LIMIT_COUNTERS) as [Limit, NonNullable<(typeof LIMIT_COUNTERS)[Limit]>][]) {
    const max = PLANS[plan].limits[limit]
    if (max !== null && (await count(db, orgId)) > max) return limit
  }
  return null
}

export const billing = new Hono<GuardEnv>()
  // Billing stays reachable for a suspended workspace, so its owner can still pay or cancel.
  .use(requireUser, requireActiveOrgAllowSuspended)
  // What the plan allows and how much is used, for every member: the UI shows it and hides what the
  // plan does not include. The server checks stay the authority.
  .get("/", async (c) => {
    const { deps, orgId, org } = c.var
    const sub = await loadSubscription(deps.db, orgId)
    const plan = sub ? PLANS[sub.plan] : null
    const limits = Object.fromEntries(
      await Promise.all(
        (Object.keys(LIMIT_COUNTERS) as Limit[]).map(async (l) => [l, { used: await LIMIT_COUNTERS[l](deps.db, orgId), limit: plan ? plan.limits[l] : 0 }] as const),
      ),
    )
    const meterRows = sub ? await deps.db.select({ meter: usage.meter, count: usage.count }).from(usage).where(and(eq(usage.organizationId, orgId), eq(usage.periodStart, sub.currentPeriodStart))) : []
    const meters = Object.fromEntries(Object.entries(plan?.meters ?? {}).map(([m, limit]) => [m, { used: meterRows.find((r) => r.meter === m)?.count ?? 0, limit }]))
    c.header("cache-control", "no-store")
    return c.json({
      subscription: sub && {
        plan: sub.plan,
        interval: sub.interval,
        status: sub.status,
        trialEndsAt: sub.trialEndsAt,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        pendingPlan: sub.pendingPlan,
        hasPortal: !!sub.providerCustomerId,
      },
      live: isLive(sub?.status),
      trialEligible: !org.noTrial && !sub,
      features: sub && isLive(sub.status) ? plan!.features : [],
      limits,
      meters,
    })
  })
  .post("/checkout", ...ownerWrite, json(PlanBody, "invalid_plan"), async (c) => {
    const { deps, orgId, org, session } = c.var
    const { plan, interval } = c.req.valid("json")
    const sub = await loadSubscription(deps.db, orgId)
    // Only a canceled or ended subscription allows a new checkout; a live or past-due one changes plan instead.
    if (sub && (isLive(sub.status) || sub.status === "past_due")) return c.json({ error: "already_subscribed" }, 409)
    const { url } = await deps.billing.createCheckout({
      organizationId: orgId,
      plan,
      interval,
      returnUrl: `${deps.config.appOrigin}/checkout-success`,
      // A trial only for the person's first workspace, and only on its first subscription.
      trial: !org.noTrial && !sub,
      email: session.user.email,
    })
    return c.json({ url }, 201)
  })
  .post("/change-plan/preview", ...owner, json(PlanBody, "invalid_plan"), async (c) => {
    const { deps, orgId } = c.var
    const { plan, interval } = c.req.valid("json")
    const sub = await loadSubscription(deps.db, orgId)
    if (!sub) return c.json({ error: "no_subscription" }, 404)
    if (plan === sub.plan && interval === sub.interval) return c.json({ error: "same_plan" }, 409)
    const limit = await exceededLimit(deps.db, orgId, plan)
    if (limit) return c.json({ error: "exceeds_plan_limits", limit }, 409)
    // null is a valid answer (the UI shows its fallback copy), not an error.
    return c.json(await deps.billing.previewChangePlan(sub.providerSubscriptionId, plan, interval))
  })
  .post("/change-plan", ...ownerWrite, json(PlanBody, "invalid_plan"), async (c) => {
    const { deps, orgId } = c.var
    const { plan, interval } = c.req.valid("json")
    const sub = await loadSubscription(deps.db, orgId)
    if (!sub) return c.json({ error: "no_subscription" }, 404)
    if (plan === sub.plan && interval === sub.interval) return c.json({ error: "same_plan" }, 409)
    const limit = await exceededLimit(deps.db, orgId, plan)
    if (limit) return c.json({ error: "exceeds_plan_limits", limit }, 409)
    // Upgrades apply now (prorated); downgrades at renewal.
    const when = monthly(plan, interval) > monthly(sub.plan, sub.interval) ? "now" : "renewal"
    // The entry is written first and the provider called inside the same transaction: a provider
    // failure rolls the entry back, and a failed entry never reaches the provider.
    await deps.db.transaction(async (tx) => {
      await writeAudit(tx, auditActor(c), { organizationId: orgId, action: "subscription.plan_changed", targetType: "subscription", targetId: sub.providerSubscriptionId, metadata: { from: { plan: sub.plan, interval: sub.interval }, to: { plan, interval }, when } })
      await deps.billing.changePlan(sub.providerSubscriptionId, plan, interval, when)
    })
    return c.json({ when })
  })
  .post("/cancel", ...ownerWrite, async (c) => {
    const sub = await loadSubscription(c.var.deps.db, c.var.orgId)
    if (!sub || !isLive(sub.status)) return c.json({ error: "no_subscription" }, 404)
    await c.var.deps.db.transaction(async (tx) => {
      await writeAudit(tx, auditActor(c), { organizationId: c.var.orgId, action: "subscription.canceled", targetType: "subscription", targetId: sub.providerSubscriptionId, metadata: { plan: sub.plan, endsAt: sub.currentPeriodEnd } })
      await c.var.deps.billing.scheduleCancel(sub.providerSubscriptionId)
    })
    return c.json({ ok: true })
  })
  .post("/resume", ...ownerWrite, async (c) => {
    const sub = await loadSubscription(c.var.deps.db, c.var.orgId)
    if (!sub) return c.json({ error: "no_subscription" }, 404)
    if (!sub.cancelAtPeriodEnd) return c.json({ error: "not_scheduled" }, 409)
    await c.var.deps.db.transaction(async (tx) => {
      await writeAudit(tx, auditActor(c), { organizationId: c.var.orgId, action: "subscription.resumed", targetType: "subscription", targetId: sub.providerSubscriptionId, metadata: { plan: sub.plan } })
      await c.var.deps.billing.resume(sub.providerSubscriptionId)
    })
    return c.json({ ok: true })
  })
  // The provider's portal: payment method and invoices, including while past due.
  .post("/portal", ...ownerWrite, async (c) => {
    const { deps, orgId } = c.var
    const sub = await loadSubscription(deps.db, orgId)
    if (!sub?.providerCustomerId) return c.json({ error: "no_subscription" }, 404)
    return c.json({ url: await deps.billing.customerPortalUrl(sub.providerCustomerId, `${deps.config.appOrigin}/billing`) })
  })
