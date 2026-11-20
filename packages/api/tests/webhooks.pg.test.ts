import { afterAll, beforeEach, describe, expect, test, vi } from "vitest"

import { eq, subscriptions } from "@workspace/db"
import { TEST_PG_URL } from "@workspace/db/testing"

import { testBilling, webhook } from "./helpers/billing"
import { createPgApp } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("billing webhook against real Postgres", () => {
  const mail = { send: vi.fn(async () => {}) }
  const jobs = { send: vi.fn(async () => {}), define: () => ({}), serve: () => async () => new Response() }
  const pending: Promise<unknown>[] = []
  const t = TEST_PG_URL ? createPgApp({ billing: testBilling(), mail: mail as never, jobs: jobs as never, waitUntil: (p) => void pending.push(p) }) : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  beforeEach(() => {
    mail.send.mockClear()
    jobs.send.mockClear()
  })

  const deliver = async (w: ReturnType<typeof webhook>) => {
    const res = await t.app.request("https://app.test/api/webhooks/billing", { method: "POST", headers: w.headers, body: w.body })
    await Promise.all(pending.splice(0))
    return res
  }
  async function workspace() {
    const email = t.email("billing-owner")
    const jar = await t.signIn(email)
    const orgId = ((await (await t.call("/api/organizations", { cookie: jar })).json()) as { activeId: string }).activeId
    return { email, jar, orgId }
  }
  const row = async (orgId: string) => (await t.db.select().from(subscriptions).where(eq(subscriptions.organizationId, orgId)))[0]

  test("a forged signature is 401 invalid_signature and writes nothing", async () => {
    const { orgId } = await workspace()
    const w = webhook({ type: "subscription.active", organizationId: orgId })
    const res = await deliver({ ...w, headers: { ...w.headers, "webhook-signature": "v1,AAAA" } })
    expect([res.status, await res.json()]).toEqual([401, { error: "invalid_signature" }])
    expect(await row(orgId)).toBeUndefined()
  })

  test("a trial starts: the row is trialing, the change is announced, and no lifecycle email is sent", async () => {
    const { orgId } = await workspace()
    expect((await deliver(webhook({ type: "subscription.active", organizationId: orgId }))).status).toBe(200)
    expect(await row(orgId)).toMatchObject({ status: "trialing", plan: "pro", interval: "month", providerCustomerId: `cus_sim_${orgId}` })
    expect(jobs.send).toHaveBeenCalledWith("billing/subscription.changed", { organizationId: orgId, previousStatus: null, nextStatus: "trialing" }, expect.any(String))
    expect(mail.send).not.toHaveBeenCalled()
  })

  test("a replayed webhook id returns 200 and is applied once", async () => {
    const { orgId } = await workspace()
    await deliver(webhook({ type: "subscription.active", organizationId: orgId }))
    const charged = webhook({ type: "subscription.renewed", organizationId: orgId }, `msg_replay_${orgId}`)
    expect((await deliver(charged)).status).toBe(200)
    expect((await deliver(charged)).status).toBe(200)
    expect(mail.send).toHaveBeenCalledTimes(1)
    expect(jobs.send).toHaveBeenCalledTimes(2)
  })

  test("trial converts: active, subscription.changed trialing -> active, and one subscription started email", async () => {
    const { email, orgId } = await workspace()
    await deliver(webhook({ type: "subscription.active", organizationId: orgId }))
    jobs.send.mockClear()
    await deliver(webhook({ type: "subscription.renewed", organizationId: orgId }))
    expect((await row(orgId))?.status).toBe("active")
    expect(jobs.send).toHaveBeenCalledWith("billing/subscription.changed", { organizationId: orgId, previousStatus: "trialing", nextStatus: "active" }, expect.any(String))
    expect(mail.send).toHaveBeenCalledWith("subscriptionStarted", email, { planName: "Pro", priceUsd: 79, interval: "month" })
  })

  test("payment failure: past due and one payment failed email linking to billing", async () => {
    const { email, orgId } = await workspace()
    await deliver(webhook({ type: "subscription.renewed", organizationId: orgId }))
    mail.send.mockClear()
    await deliver(webhook({ type: "subscription.on_hold", organizationId: orgId }))
    expect((await row(orgId))?.status).toBe("past_due")
    expect(mail.send).toHaveBeenCalledWith("paymentFailed", email, { updatePaymentUrl: "https://app.test/billing" })
  })

  test("a scheduled cancellation sends one subscription canceled email", async () => {
    const { email, orgId } = await workspace()
    await deliver(webhook({ type: "subscription.renewed", organizationId: orgId }))
    mail.send.mockClear()
    await deliver(webhook({ type: "subscription.updated", organizationId: orgId, trial: false, cancelAtPeriodEnd: true }))
    expect((await row(orgId))?.cancelAtPeriodEnd).toBe(true)
    expect(mail.send).toHaveBeenCalledWith("subscriptionCanceled", email, expect.objectContaining({ resumeUrl: "https://app.test/billing" }))
  })

  test("an email provider failure still answers 200 and keeps the change", async () => {
    const { orgId } = await workspace()
    await deliver(webhook({ type: "subscription.active", organizationId: orgId }))
    mail.send.mockRejectedValueOnce(new Error("provider down"))
    expect((await deliver(webhook({ type: "subscription.renewed", organizationId: orgId }))).status).toBe(200)
    expect((await row(orgId))?.status).toBe("active")
  })

  test("an event for a workspace that no longer exists is acknowledged and ignored", async () => {
    const res = await deliver(webhook({ type: "subscription.active", organizationId: "purged-workspace" }))
    expect(res.status).toBe(200)
    expect(await t.db.select().from(subscriptions).where(eq(subscriptions.providerSubscriptionId, "sub_sim_purged-workspace"))).toEqual([])
  })
})
