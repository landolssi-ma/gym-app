// pnpm billing:sign <body-file> [--id <webhook-id>]: prints the headers that make a request body a
// validly signed billing webhook, using BILLING_WEBHOOK_SECRET from apps/web/.env.
import { readFileSync } from "node:fs"
import { parseArgs } from "node:util"

import { signedHeaders } from "@workspace/billing/sign"

const { values: args, positionals } = parseArgs({ allowPositionals: true, options: { id: { type: "string" } } })
if (!positionals[0]) {
  console.error("usage: billing-sign.ts <body-file> [--id <webhook-id>]")
  process.exit(2)
}
process.loadEnvFile(new URL("../../apps/web/.env", import.meta.url).pathname)
const secret = process.env.BILLING_WEBHOOK_SECRET // eslint-disable-line turbo/no-undeclared-env-vars
if (!secret) {
  console.error("BILLING_WEBHOOK_SECRET is not set in apps/web/.env")
  process.exit(1)
}
for (const [k, v] of Object.entries(signedHeaders(secret, readFileSync(positionals[0], "utf8"), args.id))) console.log(`${k}: ${v}`)
