import { expect, test } from "vitest"

import { INTERVALS, PLAN_IDS, PLANS } from "../src"

test("every plan is complete: name, positive prices for each interval, trial days, both limits", () => {
  expect(new Set(PLAN_IDS).size).toBe(PLAN_IDS.length)
  for (const id of PLAN_IDS) {
    const plan = PLANS[id]
    expect(plan.name.length, id).toBeGreaterThan(0)
    for (const interval of INTERVALS) expect(plan.priceUsd[interval], `${id} ${interval}`).toBeGreaterThan(0)
    expect(plan.trialDays, id).toBeGreaterThanOrEqual(0)
    expect(Object.keys(plan.limits).sort(), id).toEqual(["projects", "seats"])
  }
})
