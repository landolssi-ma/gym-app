import { afterEach, describe, expect, test, vi } from "vitest"

import { deriveSub, ensureWebhook, normalizeWebhookEvent, syncProducts, type DodoSubscription, type ProductIds } from "../src"

const productIds: ProductIds = { "starter:month": "p_sm", "starter:year": "p_sy", "pro:month": "p_pm", "pro:year": "p_py", "business:month": "p_bm", "business:year": "p_by" }
const day = 86_400_000
const dodo = (over: Partial<DodoSubscription> = {}, start = new Date(Date.now() - 2 * day).toISOString()): DodoSubscription => ({
  subscription_id: "sub_1",
  product_id: "p_py",
  status: "active",
  trial_period_days: 14,
  created_at: start,
  previous_billing_date: start,
  next_billing_date: new Date(Date.now() + 12 * day).toISOString(),
  cancel_at_next_billing_date: false,
  metadata: { organizationId: "org1" },
  customer: { customer_id: "cus_1" },
  ...over,
})

afterEach(() => vi.useRealTimers())

describe("deriveSub", () => {
  test("an active subscription inside its trial, never charged, is trialing; plan, interval and customer come through", () => {
    const s = deriveSub(productIds, dodo())
    expect(s).toMatchObject({ plan: "pro", interval: "year", status: "trialing", providerCustomerId: "cus_1" })
    expect(s.trialEndsAt!.getTime()).toBeGreaterThan(Date.now())
  })

  test("a charge during the trial ends it", () => {
    expect(deriveSub(productIds, dodo({ previous_billing_date: new Date(Date.now() - day).toISOString() })).status).toBe("active")
  })

  test("past the trial end it is active", () => {
    expect(deriveSub(productIds, dodo({}, new Date(Date.now() - 20 * day).toISOString())).status).toBe("active")
  })

  test.each([["on_hold", "past_due"], ["past_due", "past_due"], ["cancelled", "canceled"], ["expired", "ended"], ["failed", "ended"]] as const)("Dodo %s -> %s", (status, want) => {
    expect(deriveSub(productIds, dodo({ status })).status).toBe(want)
  })

  test("a scheduled change names the pending plan", () => {
    expect(deriveSub(productIds, dodo({ scheduled_change: { product_id: "p_sm" } })).pendingPlan).toBe("starter")
  })

  test("an unknown product is an error that says to run billing:setup", () => {
    expect(() => deriveSub(productIds, dodo({ product_id: "p_other" }))).toThrow("billing:setup")
  })
})

describe("normalizeWebhookEvent", () => {
  test("a subscription event carries the organization from metadata", () => {
    expect(normalizeWebhookEvent(productIds, { type: "subscription.active", data: dodo() })).toMatchObject({ type: "subscription.active", organizationId: "org1" })
  })

  test("payment.succeeded and unknown events never reach deriveSub", () => {
    expect(normalizeWebhookEvent(productIds, { type: "payment.succeeded", data: { subscription_id: "sub_1" } as DodoSubscription })).toEqual({ type: "unknown", organizationId: "", sub: null })
    expect(normalizeWebhookEvent(productIds, { type: "dispute.opened" })).toEqual({ type: "unknown", organizationId: "", sub: null })
  })
})

describe("syncProducts", () => {
  function fakeProducts() {
    const store: { product_id: string; metadata: Record<string, string>; price_detail: unknown }[] = []
    const client = {
      products: {
        list: () => (async function* () { yield* store })(),
        create: vi.fn(async (body: { metadata: Record<string, string>; price: unknown }) => {
          const p = { product_id: `p_${store.length}`, metadata: body.metadata, price_detail: body.price }
          store.push(p)
          return p
        }),
        update: vi.fn(async (id: string, body: { price: unknown }) => {
          store.find((p) => p.product_id === id)!.price_detail = body.price
        }),
      },
    }
    return { client: client as never, create: client.products.create, update: client.products.update, store }
  }

  test("creates one product per plan and interval, and a second run changes nothing", async () => {
    const f = fakeProducts()
    const ids = await syncProducts(f.client)
    expect(Object.keys(ids).sort()).toEqual(Object.keys(productIds).sort())
    expect(f.create).toHaveBeenCalledTimes(6)
    await syncProducts(f.client)
    expect(f.create).toHaveBeenCalledTimes(6)
    expect(f.update).not.toHaveBeenCalled()
  })

  test("a drifted price is updated in place", async () => {
    const f = fakeProducts()
    await syncProducts(f.client)
    ;(f.store[0]!.price_detail as { price: number }).price = 1
    await syncProducts(f.client)
    expect(f.update).toHaveBeenCalledTimes(1)
    expect(f.create).toHaveBeenCalledTimes(6)
  })
})

describe("ensureWebhook", () => {
  test("creates the endpoint once, then updates it, and returns its secret", async () => {
    const hooks: { id: string; url: string }[] = []
    const client = {
      webhooks: {
        list: () => (async function* () { yield* hooks })(),
        create: vi.fn(async ({ url }: { url: string }) => (hooks.push({ id: "wh_1", url }), { id: "wh_1" })),
        update: vi.fn(async () => ({})),
        retrieveSecret: async () => ({ secret: "whsec_x" }),
      },
    }
    expect(await ensureWebhook(client as never, "https://app.test/api/webhooks/billing")).toEqual({ secret: "whsec_x" })
    await ensureWebhook(client as never, "https://app.test/api/webhooks/billing")
    expect(client.webhooks.create).toHaveBeenCalledTimes(1)
    expect(client.webhooks.update).toHaveBeenCalledTimes(1)
  })
})
