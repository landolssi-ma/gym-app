import { PLANS, type Feature, type Limit, type PlanId } from "./plans"
import { isLive, type SubStatus } from "./reducer"

// Every refusal has this body with status 402; the client opens one upgrade dialog for all of them.
export type UpgradeRequired = { error: "upgrade_required"; reason: Feature | Limit | string | "subscription_inactive"; used?: number; limit?: number }

export const upgradeRequired = (reason: UpgradeRequired["reason"], counts?: { used: number; limit: number }): UpgradeRequired => ({ error: "upgrade_required", reason, ...counts })

// A feature needs a live subscription on a plan that includes it.
export function can(sub: { plan: PlanId; status: SubStatus } | null, feature: Feature): UpgradeRequired | null {
  if (!sub || !isLive(sub.status)) return upgradeRequired("subscription_inactive")
  return (PLANS[sub.plan].features as readonly Feature[]).includes(feature) ? null : upgradeRequired(feature)
}

// null when the plan has no limit for it.
export const limitOf = (plan: PlanId, limit: Limit) => PLANS[plan].limits[limit]
export const meterOf = (plan: PlanId, meter: string): number | undefined => (PLANS[plan].meters as Record<string, number>)[meter]
