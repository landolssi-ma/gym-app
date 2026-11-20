import { createHmac } from "node:crypto"

import { PLANS, productKey, type Interval, type PlanId } from "./plans"
import type { ProductIds } from "./dodo"

// Standard Webhooks signing, the algorithm Dodo's webhook verification (Billing.parseWebhook) checks.
// For local simulation and tests only; never on the request path.
export function signBillingWebhook(secret: string, id: string, timestampSeconds: number, body: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64")
  return `v1,${createHmac("sha256", key).update(`${id}.${timestampSeconds}.${body}`).digest("base64")}`
}

const DODO_STATUS = {
  "subscription.active": "active",
  "subscription.renewed": "active",
  "subscription.updated": "active",
  "subscription.plan_changed": "active",
  "subscription.on_hold": "on_hold",
  "subscription.cancelled": "cancelled",
} as const
export type SimulatedEvent = keyof typeof DODO_STATUS
export const SIMULATED_EVENTS = Object.keys(DODO_STATUS) as SimulatedEvent[]

// A Dodo-shaped webhook body. The subscription id is stable per workspace, so successive events
// update one subscription: active (trial), renewed (charged), on_hold, cancelled.
export function simulatedWebhookBody(input: {
  type: SimulatedEvent
  organizationId: string
  productIds: ProductIds
  plan?: PlanId
  interval?: Interval
  trial?: boolean
  cancelAtPeriodEnd?: boolean
}): string {
  const plan = input.plan ?? "pro"
  const interval = input.interval ?? "month"
  const now = Date.now()
  const trialDays = input.trial === false || input.type === "subscription.renewed" ? 0 : PLANS[plan].trialDays
  const periodDays = interval === "month" ? 30 : 365
  return JSON.stringify({
    business_id: "biz_simulated",
    type: input.type,
    timestamp: new Date(now).toISOString(),
    data: {
      subscription_id: `sub_sim_${input.organizationId}`,
      product_id: input.productIds[productKey(plan, interval)],
      status: DODO_STATUS[input.type],
      trial_period_days: trialDays,
      created_at: new Date(now - 60_000).toISOString(),
      // A renewal is a charge: the last billing date moves past the creation date.
      previous_billing_date: new Date(input.type === "subscription.renewed" ? now : now - 60_000).toISOString(),
      next_billing_date: new Date(now + (trialDays || periodDays) * 86_400_000).toISOString(),
      cancel_at_next_billing_date: input.cancelAtPeriodEnd ?? false,
      metadata: { organizationId: input.organizationId },
      customer: { customer_id: `cus_sim_${input.organizationId}`, email: "simulated@example.com" },
    },
  })
}

// Headers for a signed delivery of `body`.
export function signedHeaders(secret: string, body: string, id = `msg_${crypto.randomUUID()}`): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000)
  return { "content-type": "application/json", "webhook-id": id, "webhook-timestamp": String(timestamp), "webhook-signature": signBillingWebhook(secret, id, timestamp, body) }
}
