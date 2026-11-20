import { describe, expect, it } from "vitest"

import { createBilling, type ProductIds } from "@workspace/billing"
import { signBillingWebhook, signedHeaders, simulatedWebhookBody } from "@workspace/billing/sign"

// base64 of "test-webhook-secret-0000": a fixture key, not a credential.
const secret = "whsec_dGVzdC13ZWJob29rLXNlY3JldC0wMDAw"
const productIds: ProductIds = { "starter:month": "a", "starter:year": "b", "pro:month": "c", "pro:year": "d", "business:month": "e", "business:year": "f" }
const billing = () => createBilling({ apiKey: "k", webhookSecret: secret, testMode: true, productIds })

describe("signed simulated webhooks", () => {
  it("round-trip through the real parseWebhook", async () => {
    const body = simulatedWebhookBody({ type: "subscription.active", organizationId: "org1", productIds })
    const event = await billing().parseWebhook(body, signedHeaders(secret, body))
    expect(event).toMatchObject({ type: "subscription.active", organizationId: "org1", sub: { plan: "pro", interval: "month", status: "trialing", providerSubscriptionId: "sub_sim_org1" } })
  })

  it("on_hold is past due, renewed is a charged active subscription", async () => {
    for (const [type, status] of [["subscription.on_hold", "past_due"], ["subscription.renewed", "active"]] as const) {
      const body = simulatedWebhookBody({ type, organizationId: "org1", productIds })
      expect((await billing().parseWebhook(body, signedHeaders(secret, body))).sub?.status).toBe(status)
    }
  })

  it("a tampered signature is rejected", async () => {
    const body = simulatedWebhookBody({ type: "subscription.active", organizationId: "org1", productIds })
    const headers = signedHeaders(secret, body)
    const tampered = { ...headers, "webhook-signature": signBillingWebhook("whsec_b3RoZXI=", headers["webhook-id"]!, Number(headers["webhook-timestamp"]), body) }
    await expect(billing().parseWebhook(body, tampered)).rejects.toThrow()
  })
})
