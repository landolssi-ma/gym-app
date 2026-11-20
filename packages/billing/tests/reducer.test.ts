import { describe, expect, test } from "vitest"

import { isLive, lifecycleEmail, reduce, type SubscriptionFields } from "../src"

const sub = (over: Partial<SubscriptionFields> = {}): SubscriptionFields => ({
  plan: "pro",
  interval: "month",
  status: "active",
  trialEndsAt: null,
  currentPeriodStart: new Date("2026-11-01"),
  currentPeriodEnd: new Date("2026-12-01"),
  cancelAtPeriodEnd: false,
  pendingPlan: null,
  providerSubscriptionId: "sub_1",
  providerCustomerId: "cus_1",
  ...over,
})

describe("reduce", () => {
  test("replaces every field with the event's snapshot, keeping the organization when the event has none", () => {
    const current = { ...sub(), organizationId: "org1" }
    expect(reduce(current, { type: "subscription.updated", organizationId: "", sub: sub({ plan: "business" }) })).toEqual({ ...sub({ plan: "business" }), organizationId: "org1" })
  })

  test("replaying the same event converges to the same row", () => {
    const event = { type: "subscription.renewed" as const, organizationId: "org1", sub: sub() }
    expect(reduce(reduce(null, event), event)).toEqual(reduce(null, event))
  })
})

describe("isLive", () => {
  test.each([["trialing", true], ["active", true], ["past_due", false], ["canceled", false], ["ended", false]] as const)("%s -> %s", (status, live) => {
    expect(isLive(status)).toBe(live)
  })
})

describe("lifecycleEmail", () => {
  test.each([
    ["trial converts", sub({ status: "trialing" }), sub(), "subscriptionStarted"],
    ["charged at checkout", null, sub(), "subscriptionStarted"],
    ["trial starts: nothing (the welcome email was sent at sign-up)", null, sub({ status: "trialing" }), null],
    ["payment fails", sub(), sub({ status: "past_due" }), "paymentFailed"],
    ["still past due", sub({ status: "past_due" }), sub({ status: "past_due" }), null],
    ["recovers from past due", sub({ status: "past_due" }), sub(), "subscriptionStarted"],
    ["cancel scheduled", sub(), sub({ cancelAtPeriodEnd: true }), "subscriptionCanceled"],
    ["cancel scheduled during trial", sub({ status: "trialing" }), sub({ status: "trialing", cancelAtPeriodEnd: true }), "subscriptionCanceled"],
    ["already canceling, period ends", sub({ cancelAtPeriodEnd: true }), sub({ status: "canceled", cancelAtPeriodEnd: true }), null],
    ["renewal", sub(), sub({ currentPeriodEnd: new Date("2027-01-01") }), null],
  ] as const)("%s", (_label, prev, next, want) => {
    expect(lifecycleEmail(prev, next)).toBe(want)
  })
})
