import { afterAll, describe, expect, test } from "vitest"

import { Hono } from "hono"
import { TEST_PG_URL } from "@workspace/db/testing"

import { requireLiveSubscription } from "../src/entitlements"
import { requireActiveOrg, requireUser, type GuardEnv } from "../src/guards"
import { createPgApp } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("entitlements read and live-subscription guard against real Postgres", () => {
  const t = TEST_PG_URL ? createPgApp() : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  // A product route stand-in.
  ;(t.app as unknown as Hono<GuardEnv>)?.get?.("/api/product-probe", requireUser, requireActiveOrg, requireLiveSubscription, (c) => c.json({ ok: true }))

  test("shows plan, status, features and each limit as used of limit, matching what is enforced", async () => {
    const { jar } = await t.owner("reader")
    await t.call("/api/team/invites", { method: "POST", body: { email: t.email("i") }, cookie: jar })
    const body = (await (await t.call("/api/billing", { cookie: jar })).json()) as Record<string, unknown>
    expect(body).toMatchObject({ subscription: { plan: "pro", interval: "month", status: "active", hasPortal: true }, live: true, trialEligible: false, features: ["export"], limits: { seats: { used: 2, limit: 5 } } })
  })

  test("a workspace that never subscribed is trial-eligible, not live, with no features", async () => {
    const jar = await t.signIn(t.email("new"))
    expect(await (await t.call("/api/billing", { cookie: jar })).json()).toMatchObject({ subscription: null, live: false, trialEligible: true, features: [] })
  })

  test("product routes answer 402 subscription_inactive without a live subscription", async () => {
    const jar = await t.signIn(t.email("nolive"))
    const res = await t.call("/api/product-probe", { cookie: jar })
    expect([res.status, await res.json()]).toEqual([402, { error: "upgrade_required", reason: "subscription_inactive" }])
    const { jar: paid } = await t.owner("paid")
    expect((await t.call("/api/product-probe", { cookie: paid })).status).toBe(200)
  })
})
