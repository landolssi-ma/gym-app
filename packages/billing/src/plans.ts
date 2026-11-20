// Every plan, in one place. `pnpm billing:setup` creates or updates the matching Dodo products, and
// the pricing page, plans page, checkout and entitlements all read from here. There is no free plan.
export const INTERVALS = ["month", "year"] as const
export type Interval = (typeof INTERVALS)[number]

export type PlanDefinition = {
  name: string
  priceUsd: Record<Interval, number>
  trialDays: number
  // Count limits checked inside the write; null is unlimited.
  limits: { seats: number | null; projects: number | null }
  // Units per billing period, checked and counted in one statement. A product adds its meters here.
  meters: Record<string, number>
  features: readonly Feature[]
}

export type Feature = "export"

export const PLANS = {
  starter: { name: "Starter", priceUsd: { month: 19, year: 190 }, trialDays: 14, limits: { seats: 1, projects: 3 }, meters: {}, features: [] },
  pro: { name: "Pro", priceUsd: { month: 79, year: 790 }, trialDays: 14, limits: { seats: 5, projects: 25 }, meters: {}, features: ["export"] },
  business: { name: "Business", priceUsd: { month: 199, year: 1990 }, trialDays: 14, limits: { seats: 20, projects: null }, meters: {}, features: ["export"] },
} as const satisfies Record<string, PlanDefinition>

export type PlanId = keyof typeof PLANS
export type Limit = keyof PlanDefinition["limits"]
export const PLAN_IDS = Object.keys(PLANS) as PlanId[]
export const isPlanId = (v: unknown): v is PlanId => typeof v === "string" && v in PLANS
// The key a provider product is stored under, one per plan and interval.
export const productKey = (plan: PlanId, interval: Interval) => `${plan}:${interval}` as const
export type ProductKey = ReturnType<typeof productKey>
