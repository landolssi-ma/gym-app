// pnpm billing:setup --mode test|live --url <origin>
//
// Creates or updates one Dodo product per plan and interval from packages/billing/src/plans.ts and
// registers the /api/webhooks/billing webhook, idempotently, then writes the product ids and the
// webhook secret into the target env file. For local webhooks, pass a tunnel URL (`pnpm tunnel`).
import { existsSync, readFileSync } from "node:fs"
import { parseArgs } from "node:util"

import { createBillingAdmin } from "@workspace/billing"

import { upsertEnvFile } from "../../apps/web/lib/env-file"

const USAGE = "usage: billing-setup.ts --mode test|live --url <origin>"
const { values: args } = parseArgs({ options: { mode: { type: "string" }, url: { type: "string" } } })
if ((args.mode !== "test" && args.mode !== "live") || !args.url) {
  console.error(USAGE)
  process.exit(2)
}
const mode = args.mode
const envFile = new URL(mode === "test" ? "../../apps/web/.env" : "../../apps/web/.env.production", import.meta.url).pathname
if (!existsSync(envFile)) {
  console.error(`${envFile} does not exist -- nothing to write into`)
  process.exit(1)
}
process.loadEnvFile(envFile)
const apiKey = process.env.BILLING_API_KEY // eslint-disable-line turbo/no-undeclared-env-vars
if (!apiKey || apiKey.startsWith("dev-")) {
  console.error(`BILLING_API_KEY is not set in ${envFile} -- get it from the Dodo dashboard first`)
  process.exit(1)
}

const admin = createBillingAdmin({ apiKey, testMode: mode === "test" })
const ids = await admin.syncProducts()
const { secret } = await admin.ensureWebhook(`${args.url}/api/webhooks/billing`)
const updates = { BILLING_PRODUCT_IDS: JSON.stringify(ids), BILLING_WEBHOOK_SECRET: secret, BILLING_TEST_MODE: mode === "test" ? "1" : "0" }
// Key names only, never values.
const before = readFileSync(envFile, "utf8")
upsertEnvFile(envFile, updates)
for (const key of Object.keys(updates)) console.log(`${key} ${new RegExp(`^${key}=`, "m").test(before) ? "updated" : "set"}`)
console.log(`Billing setup complete (${mode} mode): ${Object.keys(ids).length} products synced, webhook at ${args.url}/api/webhooks/billing`)
