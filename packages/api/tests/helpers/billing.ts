import { createBilling, type ProductIds } from "@workspace/billing"
import { signedHeaders, simulatedWebhookBody, type SimulatedEvent } from "@workspace/billing/sign"

export const WEBHOOK_SECRET = "whsec_dGVzdC13ZWJob29rLXNlY3JldC0wMDAw"
export const PRODUCT_IDS: ProductIds = { "starter:month": "a", "starter:year": "b", "pro:month": "c", "pro:year": "d", "business:month": "e", "business:year": "f" }

// Real webhook verification with a fixture secret; provider calls replaced by spies where given.
export function testBilling(calls: Partial<ReturnType<typeof createBilling>> = {}) {
  return { ...createBilling({ apiKey: "k", webhookSecret: WEBHOOK_SECRET, testMode: true, productIds: PRODUCT_IDS }), ...calls }
}

export function webhook(input: Omit<Parameters<typeof simulatedWebhookBody>[0], "productIds"> & { type: SimulatedEvent }, id?: string) {
  const body = simulatedWebhookBody({ ...input, productIds: PRODUCT_IDS })
  return { body, headers: signedHeaders(WEBHOOK_SECRET, body, id) }
}
