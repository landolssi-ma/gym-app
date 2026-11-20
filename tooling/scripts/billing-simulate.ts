// pnpm billing:simulate <event> --org <workspace-id> [--plan pro] [--interval month] [--no-trial] [--cancel] [--url <origin>]
//
// Sends a signed, Dodo-shaped webhook to the local /api/webhooks/billing, so the whole billing
// lifecycle can be exercised without Dodo keys. Events for one workspace update one subscription:
//   subscription.active (trial starts)  subscription.renewed (charged)
//   subscription.on_hold (payment failed)  subscription.cancelled  subscription.updated --cancel
import { parseArgs } from "node:util"

import { INTERVALS, isPlanId, type Interval } from "@workspace/billing"
import { SIMULATED_EVENTS, signedHeaders, simulatedWebhookBody, type SimulatedEvent } from "@workspace/billing/sign"

const USAGE = `usage: billing-simulate.ts <event> --org <id> [--plan pro] [--interval month|year] [--no-trial] [--cancel] [--url <origin>]\nevents: ${SIMULATED_EVENTS.join(", ")}`
const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: { org: { type: "string" }, plan: { type: "string" }, interval: { type: "string" }, "no-trial": { type: "boolean" }, cancel: { type: "boolean" }, url: { type: "string" } },
})
const type = positionals[0] as SimulatedEvent
if (!SIMULATED_EVENTS.includes(type) || !args.org || (args.plan && !isPlanId(args.plan)) || (args.interval && !INTERVALS.includes(args.interval as Interval))) {
  console.error(USAGE)
  process.exit(2)
}
process.loadEnvFile(new URL("../../apps/web/.env", import.meta.url).pathname)
/* eslint-disable turbo/no-undeclared-env-vars */
const url = args.url ?? process.env.APP_ORIGIN ?? "http://localhost:5173"
const secret = process.env.BILLING_WEBHOOK_SECRET
const productIds = process.env.BILLING_PRODUCT_IDS
/* eslint-enable turbo/no-undeclared-env-vars */
if (!secret || !productIds) {
  console.error("BILLING_WEBHOOK_SECRET and BILLING_PRODUCT_IDS must be set in apps/web/.env")
  process.exit(1)
}
const body = simulatedWebhookBody({
  type,
  organizationId: args.org,
  productIds: JSON.parse(productIds),
  plan: isPlanId(args.plan) ? args.plan : undefined,
  interval: args.interval as Interval | undefined,
  trial: !args["no-trial"],
  cancelAtPeriodEnd: args.cancel,
})
const res = await fetch(`${url}/api/webhooks/billing`, { method: "POST", headers: signedHeaders(secret, body), body })
console.log(`${res.status} ${await res.text()}`)
if (!res.ok) process.exit(1)
