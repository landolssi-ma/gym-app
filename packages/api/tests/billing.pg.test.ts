import { afterAll, beforeEach, describe, expect, test, vi } from "vitest"

import { eq, organization, subscriptions } from "@workspace/db"
import { TEST_PG_URL } from "@workspace/db/testing"

import { testBilling, webhook } from "./helpers/billing"
import { createPgApp } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("billing routes against real Postgres", () => {
  const provider = {
    createCheckout: vi.fn(async () => ({ url: "https://checkout.test/s" })),
    previewChangePlan: vi.fn(async () => ({ chargeUsd: 42.5 })),
    changePlan: vi.fn(async () => {}),
    scheduleCancel: vi.fn(async () => {}),
    resume: vi.fn(async () => {}),
    customerPortalUrl: vi.fn(async () => "https://portal.test/p"),
  }
  const t = TEST_PG_URL ? createPgApp({ billing: testBilling(provider) }) : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  beforeEach(() => Object.values(provider).forEach((f) => f.mockClear()))
  const post = (path: string, cookie: string, body: unknown = {}) => t.call(`/api/billing${path}`, { method: "POST", body, cookie })
  const deliver = (w: ReturnType<typeof webhook>) => t.app.request("https://app.test/api/webhooks/billing", { method: "POST", headers: w.headers, body: w.body })

  async function workspace() {
    const email = t.email("owner")
    const jar = await t.signIn(email)
    const orgId = ((await (await t.call("/api/organizations", { cookie: jar })).json()) as { activeId: string }).activeId
    return { email, jar, orgId }
  }

  test("first checkout of the sign-up workspace gets the trial and the yearly price", async () => {
    const { email, jar, orgId } = await workspace()
    const res = await post("/checkout", jar, { plan: "pro", interval: "year" })
    expect([res.status, await res.json()]).toEqual([201, { url: "https://checkout.test/s" }])
    expect(provider.createCheckout).toHaveBeenCalledWith({ organizationId: orgId, plan: "pro", interval: "year", returnUrl: "https://app.test/checkout-success", trial: true, email })
  })

  test("a workspace created later gets no trial", async () => {
    const { jar } = await workspace()
    await t.call("/api/organizations", { method: "POST", body: { name: "Second" }, cookie: jar })
    await post("/checkout", jar, { plan: "pro", interval: "month" })
    expect(provider.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ trial: false }))
  })

  test("resubscribing after a canceled subscription gets no trial", async () => {
    const { jar, orgId } = await workspace()
    await deliver(webhook({ type: "subscription.cancelled", organizationId: orgId }))
    expect((await post("/checkout", jar, { plan: "pro", interval: "month" })).status).toBe(201)
    expect(provider.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ trial: false }))
  })

  test("an unknown plan is 400 invalid_plan; a live subscription is 409 already_subscribed", async () => {
    const { jar, orgId } = await workspace()
    expect(await (await post("/checkout", jar, { plan: "enterprise", interval: "month" })).json()).toEqual({ error: "invalid_plan" })
    await deliver(webhook({ type: "subscription.active", organizationId: orgId }))
    const res = await post("/checkout", jar, { plan: "pro", interval: "month" })
    expect([res.status, await res.json()]).toEqual([409, { error: "already_subscribed" }])
  })

  test("only the owner manages billing", async () => {
    const { jar: ownerJar, orgId } = await workspace()
    await t.subscribe(orgId)
    const adminEmail = t.email("admin")
    const { id } = (await (await t.call("/api/team/invites", { method: "POST", body: { email: adminEmail, role: "admin" }, cookie: ownerJar })).json()) as { id: string }
    const admin = await t.signIn(adminEmail)
    await t.call(`/api/team/invites/${id}/accept`, { method: "POST", cookie: admin })
    for (const path of ["/checkout", "/cancel", "/resume", "/portal", "/change-plan"]) expect((await post(path, admin, { plan: "pro", interval: "month" })).status, path).toBe(403)
  })

  test("plan change: preview shows the amount; upgrades apply now, downgrades at renewal; same plan is 409", async () => {
    const { jar, orgId } = await workspace()
    await deliver(webhook({ type: "subscription.renewed", organizationId: orgId, plan: "pro" }))
    expect(await (await post("/change-plan/preview", jar, { plan: "business", interval: "month" })).json()).toEqual({ chargeUsd: 42.5 })
    expect(await (await post("/change-plan", jar, { plan: "business", interval: "month" })).json()).toEqual({ when: "now" })
    expect(await (await post("/change-plan", jar, { plan: "starter", interval: "month" })).json()).toEqual({ when: "renewal" })
    // Yearly is cheaper per month than monthly: renewal.
    expect(await (await post("/change-plan", jar, { plan: "pro", interval: "year" })).json()).toEqual({ when: "renewal" })
    const same = await post("/change-plan", jar, { plan: "pro", interval: "month" })
    expect([same.status, await same.json()]).toEqual([409, { error: "same_plan" }])
  })

  test("a downgrade below current usage is 409 exceeds_plan_limits naming the limit, and nothing changes", async () => {
    const { jar, orgId } = await workspace()
    await deliver(webhook({ type: "subscription.renewed", organizationId: orgId, plan: "pro" }))
    // Starter has 1 seat; an invitation takes a second one.
    await t.call("/api/team/invites", { method: "POST", body: { email: t.email("x") }, cookie: jar })
    const res = await post("/change-plan", jar, { plan: "starter", interval: "month" })
    expect([res.status, await res.json()]).toEqual([409, { error: "exceeds_plan_limits", limit: "seats" }])
    expect(provider.changePlan).not.toHaveBeenCalled()
  })

  test("cancel and resume go to the provider; resuming what is not set to cancel is 409 not_scheduled", async () => {
    const { jar, orgId } = await workspace()
    await deliver(webhook({ type: "subscription.renewed", organizationId: orgId }))
    expect(await (await post("/resume", jar)).json()).toEqual({ error: "not_scheduled" })
    expect((await post("/cancel", jar)).status).toBe(200)
    expect(provider.scheduleCancel).toHaveBeenCalledWith(`sub_sim_${orgId}`)
    await deliver(webhook({ type: "subscription.updated", organizationId: orgId, trial: false, cancelAtPeriodEnd: true }))
    expect((await post("/resume", jar)).status).toBe(200)
    expect(provider.resume).toHaveBeenCalledWith(`sub_sim_${orgId}`)
  })

  test("a past-due owner opens the customer portal", async () => {
    const { jar, orgId } = await workspace()
    await deliver(webhook({ type: "subscription.on_hold", organizationId: orgId }))
    expect(await (await post("/portal", jar)).json()).toEqual({ url: "https://portal.test/p" })
    expect(provider.customerPortalUrl).toHaveBeenCalledWith(`cus_sim_${orgId}`, "https://app.test/billing")
  })

  test("billing stays reachable for a suspended workspace", async () => {
    const { jar, orgId } = await workspace()
    await deliver(webhook({ type: "subscription.renewed", organizationId: orgId }))
    await t.db.update(organization).set({ suspended: true }).where(eq(organization.id, orgId))
    expect((await post("/cancel", jar)).status).toBe(200)
    expect((await t.db.select().from(subscriptions).where(eq(subscriptions.organizationId, orgId))).length).toBe(1)
  })
})
