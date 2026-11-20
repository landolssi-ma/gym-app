import { Hono } from "hono"

import { lifecycleEmail, PLANS, reduce, type LifecycleEmail, type SubStatus } from "@workspace/billing"
import { and, eq, member, subscriptions, user, webhookEvents } from "@workspace/db"

import type { AppEnv } from "../index"

// Signature-verified, never session-gated, and exempt from the Origin check by exact path.
export const webhooks = new Hono<AppEnv>().post("/api/webhooks/billing", async (c) => {
  const { deps } = c.var
  const rawBody = await c.req.text()
  const headers = Object.fromEntries(c.req.raw.headers)
  let event
  try {
    event = await deps.billing.parseWebhook(rawBody, headers)
  } catch {
    return c.json({ error: "invalid_signature" }, 401)
  }
  const { sub, organizationId, type } = event

  type Followup = { organizationId: string; previousStatus: SubStatus | null; nextStatus: SubStatus; email: { template: LifecycleEmail; to: string } | null }
  const followup = await deps.db.transaction(async (tx): Promise<Followup | null> => {
    const [inserted] = await tx.insert(webhookEvents).values({ id: headers["webhook-id"]! }).onConflictDoNothing().returning()
    // A replay, or an event with no subscription object: deduped and done.
    if (!inserted || !sub) return null
    const [byProviderId] = await tx.select().from(subscriptions).where(eq(subscriptions.providerSubscriptionId, sub.providerSubscriptionId))
    const row = byProviderId ?? (organizationId ? (await tx.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId)))[0] : undefined)
    const current = row ? { ...row, plan: row.plan as keyof typeof PLANS, pendingPlan: row.pendingPlan as keyof typeof PLANS | null } : null
    const next = reduce(current, { type, organizationId, sub })
    // No workspace to attach it to (unknown, purged, or no owner left): acknowledged and ignored, so
    // the provider stops retrying. The dedupe row stays, so a retry is a no-op too.
    const [owner] = next.organizationId
      ? await tx
          .select({ email: user.email })
          .from(member)
          .innerJoin(user, eq(member.userId, user.id))
          .where(and(eq(member.organizationId, next.organizationId), eq(member.role, "owner")))
      : []
    if (!owner) return null
    await tx
      .insert(subscriptions)
      .values(next)
      .onConflictDoUpdate({ target: subscriptions.organizationId, set: { ...next, updatedAt: new Date() } })
    const template = lifecycleEmail(current, next)
    return { organizationId: next.organizationId, previousStatus: current?.status ?? null, nextStatus: next.status, email: template && { template, to: owner.email } }
  })

  // After commit, off the response: a failed send or event never undoes the change or fails the webhook.
  if (followup) {
    const { organizationId: orgId, previousStatus, nextStatus, email } = followup
    const after: Promise<unknown>[] = []
    if (previousStatus !== nextStatus)
      after.push(deps.jobs.send("billing/subscription.changed", { organizationId: orgId, previousStatus, nextStatus }, `billing/subscription.changed:${headers["webhook-id"]}`))
    if (email) after.push(sendLifecycleEmail(deps, email.template, email.to, sub!))
    deps.waitUntil(Promise.allSettled(after).then((rs) => rs.forEach((r) => r.status === "rejected" && deps.log.error("billing_webhook_followup", { err: r.reason }))))
  }
  return c.json({ ok: true })
})

function sendLifecycleEmail(deps: AppEnv["Variables"]["deps"], template: LifecycleEmail, to: string, sub: NonNullable<Parameters<typeof reduce>[1]["sub"]>) {
  const billingUrl = `${deps.config.appOrigin}/billing`
  if (template === "subscriptionStarted") return deps.mail.send(template, to, { planName: PLANS[sub.plan].name, priceUsd: PLANS[sub.plan].priceUsd[sub.interval], interval: sub.interval })
  if (template === "subscriptionCanceled") return deps.mail.send(template, to, { periodEndsAt: sub.trialEndsAt ?? sub.currentPeriodEnd, resumeUrl: billingUrl })
  return deps.mail.send(template, to, { updatePaymentUrl: billingUrl })
}
