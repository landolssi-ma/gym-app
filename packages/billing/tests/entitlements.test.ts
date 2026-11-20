import { describe, expect, test } from "vitest"

import { can, upgradeRequired } from "../src"

describe("can", () => {
  test("a plan with the feature and a live subscription passes", () => {
    expect(can({ plan: "pro", status: "active" }, "export")).toBeNull()
    expect(can({ plan: "pro", status: "trialing" }, "export")).toBeNull()
  })

  test("a plan without the feature is refused with the feature as reason", () => {
    expect(can({ plan: "starter", status: "active" }, "export")).toEqual({ error: "upgrade_required", reason: "export" })
  })

  test.each(["past_due", "canceled", "ended"] as const)("a %s subscription is refused as inactive", (status) => {
    expect(can({ plan: "pro", status }, "export")).toEqual({ error: "upgrade_required", reason: "subscription_inactive" })
  })

  test("no subscription is refused as inactive", () => {
    expect(can(null, "export")?.reason).toBe("subscription_inactive")
  })

  test("count refusals carry used and limit", () => {
    expect(upgradeRequired("seats", { used: 3, limit: 3 })).toEqual({ error: "upgrade_required", reason: "seats", used: 3, limit: 3 })
  })
})
