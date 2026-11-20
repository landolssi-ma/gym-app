import DodoPayments from "dodopayments"
import type { Price } from "dodopayments/resources/products/products"
import type { WebhookEventType } from "dodopayments/resources/webhook-events"

import { INTERVALS, PLAN_IDS, PLANS, productKey, type Interval, type PlanId, type ProductKey } from "./plans"
import type { BillingEvent, SubscriptionFields } from "./reducer"

// The only file that knows Dodo. Another provider is a second file with the same exports.

export type ProductIds = Record<ProductKey, string>
export type BillingConfig = { apiKey: string; webhookSecret: string; testMode: boolean; productIds: ProductIds }

function reverseProductMap(productIds: ProductIds): Map<string, { plan: PlanId; interval: Interval }> {
  return new Map(
    Object.entries(productIds).map(([key, id]) => {
      const [plan, interval] = key.split(":") as [PlanId, Interval]
      return [id, { plan, interval }]
    }),
  )
}

// Dodo's native subscription status, not ours.
type DodoStatus = "pending" | "active" | "on_hold" | "paused" | "cancelled" | "failed" | "expired" | "past_due"
export type DodoSubscription = {
  subscription_id: string
  product_id: string
  status: DodoStatus
  trial_period_days: number
  created_at: string
  previous_billing_date: string
  next_billing_date: string
  cancel_at_next_billing_date: boolean
  metadata: Record<string, string | number | boolean>
  customer?: { customer_id: string }
  scheduled_change?: { product_id: string } | null
}

// Dodo has no "trialing" status: it is derived from trial_period_days + created_at.
// previous_billing_date only moves past created_at once a charge has landed, so an upgrade charged
// during the trial reads as "the trial already ended by being charged".
export function deriveSub(productIds: ProductIds, data: DodoSubscription): SubscriptionFields {
  const reverse = reverseProductMap(productIds)
  const product = reverse.get(data.product_id)
  if (!product) throw new Error(`unknown product ${data.product_id}: run pnpm billing:setup`)
  const hasBeenCharged = Date.parse(data.previous_billing_date) > Date.parse(data.created_at)
  const trialEnd = data.trial_period_days > 0 ? new Date(Date.parse(data.created_at) + data.trial_period_days * 86_400_000) : null
  const isTrialing = data.status === "active" && !hasBeenCharged && trialEnd !== null && trialEnd > new Date()
  const status =
    data.status === "active"
      ? isTrialing
        ? "trialing"
        : "active"
      : data.status === "on_hold" || data.status === "past_due"
        ? "past_due"
        : data.status === "cancelled"
          ? "canceled"
          : data.status === "expired" || data.status === "failed"
            ? "ended"
            : "active" // "pending"/"paused": no equivalent in our statuses; Dodo's own gate still applies
  return {
    plan: product.plan,
    interval: product.interval,
    status,
    trialEndsAt: isTrialing ? trialEnd : null,
    currentPeriodStart: new Date(data.previous_billing_date),
    currentPeriodEnd: new Date(data.next_billing_date),
    cancelAtPeriodEnd: data.cancel_at_next_billing_date,
    pendingPlan: data.scheduled_change ? (reverse.get(data.scheduled_change.product_id)?.plan ?? null) : null,
    providerSubscriptionId: data.subscription_id,
    providerCustomerId: data.customer?.customer_id ?? null,
  }
}

// The events handled end to end. ensureWebhook registers exactly this list; the recognized set is
// derived from it (minus payment.succeeded, which has no subscription lifecycle meaning).
export const DODO_WEBHOOK_EVENTS = [
  "subscription.active",
  "subscription.renewed",
  "subscription.plan_changed",
  "subscription.updated",
  "subscription.on_hold",
  "subscription.cancelled",
  "payment.succeeded",
] as const satisfies readonly WebhookEventType[]

const EVENT_TYPES = new Set<BillingEvent["type"]>(DODO_WEBHOOK_EVENTS.filter((e) => e !== "payment.succeeded") as BillingEvent["type"][])

// Unrecognized events (and payment.succeeded, which has no trial or created_at fields) never reach
// deriveSub; an event without a subscription object gets `sub: null` and is only deduped.
export function normalizeWebhookEvent(productIds: ProductIds, unwrapped: { type: string; data?: DodoSubscription }): BillingEvent {
  const type = EVENT_TYPES.has(unwrapped.type as BillingEvent["type"]) ? (unwrapped.type as BillingEvent["type"]) : "unknown"
  if (type === "unknown" || !unwrapped.data?.subscription_id) return { type, organizationId: "", sub: null }
  const organizationId = unwrapped.data.metadata?.organizationId
  return { type, organizationId: typeof organizationId === "string" ? organizationId : "", sub: deriveSub(productIds, unwrapped.data) }
}

export function createBilling(config: BillingConfig) {
  const client = new DodoPayments({ bearerToken: config.apiKey, webhookKey: config.webhookSecret, environment: config.testMode ? "test_mode" : "live_mode" })

  return {
    async createCheckout(input: { organizationId: string; plan: PlanId; interval: Interval; returnUrl: string; trial: boolean; email: string }): Promise<{ url: string }> {
      const res = await client.checkoutSessions.create({
        product_cart: [{ product_id: config.productIds[productKey(input.plan, input.interval)], quantity: 1 }],
        customer: { email: input.email },
        return_url: input.returnUrl,
        metadata: { organizationId: input.organizationId },
        subscription_data: { trial_period_days: input.trial ? PLANS[input.plan].trialDays : 0 },
      })
      if (!res.checkout_url) throw new Error("dodo checkout session has no checkout_url")
      return { url: res.checkout_url }
    },

    async previewChangePlan(providerSubscriptionId: string, plan: PlanId, interval: Interval): Promise<{ chargeUsd: number | null }> {
      const preview = await client.subscriptions.previewChangePlan(providerSubscriptionId, {
        product_id: config.productIds[productKey(plan, interval)],
        quantity: 1,
        proration_billing_mode: "prorated_immediately",
      })
      const cents = preview.immediate_charge?.summary?.total_amount
      return { chargeUsd: typeof cents === "number" ? cents / 100 : null }
    },

    async changePlan(providerSubscriptionId: string, plan: PlanId, interval: Interval, when: "now" | "renewal"): Promise<void> {
      // Dodo rejects prorated_immediately with effective_at: next_billing_date; a renewal-effective
      // change has no partial period to prorate, so the full new price applies when it takes effect.
      await client.subscriptions.changePlan(providerSubscriptionId, {
        product_id: config.productIds[productKey(plan, interval)],
        quantity: 1,
        proration_billing_mode: when === "now" ? "prorated_immediately" : "full_immediately",
        effective_at: when === "now" ? "immediately" : "next_billing_date",
      })
    },

    async scheduleCancel(providerSubscriptionId: string): Promise<void> {
      await client.subscriptions.update(providerSubscriptionId, { cancel_at_next_billing_date: true })
    },

    async cancelImmediately(providerSubscriptionId: string): Promise<void> {
      await client.subscriptions.update(providerSubscriptionId, { status: "cancelled" })
    },

    async resume(providerSubscriptionId: string): Promise<void> {
      await client.subscriptions.update(providerSubscriptionId, { cancel_at_next_billing_date: false })
    },

    async customerPortalUrl(providerCustomerId: string, returnUrl: string): Promise<string> {
      return (await client.customers.customerPortal.create(providerCustomerId, { return_url: returnUrl })).link
    },

    // Verifies the Standard Webhooks signature (throws on a bad one), then normalizes the event.
    async parseWebhook(rawBody: string, headers: Record<string, string>): Promise<BillingEvent> {
      const unwrapped = client.webhooks.unwrap(rawBody, { headers }) as { type: string; data?: DodoSubscription }
      return normalizeWebhookEvent(config.productIds, unwrapped)
    },
  }
}
export type Billing = ReturnType<typeof createBilling>

// --- Admin: idempotent product + webhook sync for `pnpm billing:setup`; never on the request path. ---

// Narrow structural slices of the real client, so tests fake each with a plain object.
type ProductsClient = { products: Pick<InstanceType<typeof DodoPayments>["products"], "list" | "create" | "update"> }
type WebhooksClient = { webhooks: Pick<InstanceType<typeof DodoPayments>["webhooks"], "list" | "create" | "update" | "retrieveSecret"> }

function buildPrice(plan: PlanId, interval: Interval): Price {
  const period = interval === "month" ? "Month" : "Year"
  return {
    type: "recurring_price",
    currency: "USD",
    price: PLANS[plan].priceUsd[interval] * 100,
    payment_frequency_count: 1,
    payment_frequency_interval: period,
    subscription_period_count: 1,
    subscription_period_interval: period,
    trial_period_days: PLANS[plan].trialDays,
  }
}

function priceOutOfDate(price: Price | null | undefined, plan: PlanId, interval: Interval): boolean {
  if (!price || price.type !== "recurring_price") return true
  const want = buildPrice(plan, interval) as Extract<Price, { type: "recurring_price" }>
  return price.price !== want.price || (price.trial_period_days ?? 0) !== want.trial_period_days || price.payment_frequency_interval !== want.payment_frequency_interval
}

// One product per plan and interval, matched by metadata.plan + metadata.interval. Updates only
// drifted prices and creates only missing products: a second run with no change issues no call.
export async function syncProducts(client: ProductsClient): Promise<ProductIds> {
  const ids: Partial<ProductIds> = {}
  for await (const product of client.products.list({ recurring: true })) {
    const { plan, interval } = product.metadata as { plan?: string; interval?: string }
    if (!plan || !(plan in PLANS) || !INTERVALS.includes(interval as Interval)) continue
    const key = productKey(plan as PlanId, interval as Interval)
    if (ids[key]) continue
    ids[key] = product.product_id
    if (priceOutOfDate(product.price_detail, plan as PlanId, interval as Interval)) await client.products.update(product.product_id, { name: PLANS[plan as PlanId].name, price: buildPrice(plan as PlanId, interval as Interval) })
  }
  for (const plan of PLAN_IDS)
    for (const interval of INTERVALS) {
      const key = productKey(plan, interval)
      if (ids[key]) continue
      const created = await client.products.create({ name: PLANS[plan].name, tax_category: "saas", metadata: { plan, interval }, price: buildPrice(plan, interval) })
      ids[key] = created.product_id
    }
  return ids as ProductIds
}

// Matches an existing webhook by URL (the API has no URL filter, so it pages through all of them),
// updates its filter, else creates it; always returns the current secret.
export async function ensureWebhook(client: WebhooksClient, url: string): Promise<{ secret: string }> {
  let id: string | undefined
  for await (const hook of client.webhooks.list()) {
    if (hook.url === url) {
      id = hook.id
      break
    }
  }
  if (id) await client.webhooks.update(id, { filter_types: [...DODO_WEBHOOK_EVENTS] })
  else id = (await client.webhooks.create({ url, filter_types: [...DODO_WEBHOOK_EVENTS] })).id
  const { secret } = await client.webhooks.retrieveSecret(id)
  return { secret }
}

export function createBillingAdmin(config: { apiKey: string; testMode: boolean }) {
  const client = new DodoPayments({ bearerToken: config.apiKey, environment: config.testMode ? "test_mode" : "live_mode" })
  return { syncProducts: () => syncProducts(client), ensureWebhook: (url: string) => ensureWebhook(client, url) }
}
