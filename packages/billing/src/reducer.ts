import type { Interval, PlanId } from "./plans"

export type SubStatus = "trialing" | "active" | "past_due" | "canceled" | "ended"

export type SubscriptionFields = {
  plan: PlanId
  interval: Interval
  status: SubStatus
  trialEndsAt: Date | null
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  pendingPlan: PlanId | null
  providerSubscriptionId: string
  providerCustomerId: string | null
}
export type SubscriptionRow = SubscriptionFields & { organizationId: string }
export type BillingEvent = {
  type: "subscription.active" | "subscription.renewed" | "subscription.plan_changed" | "subscription.updated" | "subscription.on_hold" | "subscription.cancelled" | "unknown"
  organizationId: string
  // null only when the webhook carries no subscription object (e.g. a one-time payment event);
  // callers dedupe and return without calling reduce().
  sub: SubscriptionFields | null
}

// Product access: only a trialing or active subscription.
export const isLive = (status: SubStatus | null | undefined) => status === "trialing" || status === "active"

// Every webhook payload is the subscription's full current snapshot, never a diff, so replayed or
// reordered events converge to the same row: a full field replace. Only organizationId can be empty
// on the event (before a row exists) and falls back to the current row's.
export function reduce(current: SubscriptionRow | null, event: Omit<BillingEvent, "sub"> & { sub: SubscriptionFields }): SubscriptionRow {
  return { ...event.sub, organizationId: event.organizationId || current?.organizationId || "" }
}

export type LifecycleEmail = "subscriptionStarted" | "subscriptionCanceled" | "paymentFailed"

// At most one email per transition, decided from the stored row before and after the event.
export function lifecycleEmail(prev: SubscriptionFields | null, next: SubscriptionFields): LifecycleEmail | null {
  if (prev?.status !== "past_due" && next.status === "past_due") return "paymentFailed"
  if (prev?.status !== "active" && next.status === "active") return "subscriptionStarted"
  const wasCanceling = !!prev && (prev.cancelAtPeriodEnd || prev.status === "canceled")
  if (!wasCanceling && isLive(prev?.status) && (next.cancelAtPeriodEnd || next.status === "canceled")) return "subscriptionCanceled"
  return null
}
