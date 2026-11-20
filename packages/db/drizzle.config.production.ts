import { existsSync } from "node:fs"
import { defineConfig } from "drizzle-kit"

// Isolated from drizzle.config.ts on purpose: dev reads apps/web/.env (Docker Postgres), this reads
// apps/web/.env.production (Neon) and only this file. Never falls back to apps/web/.env: a missing
// .env.production must fail loudly, not silently migrate dev data.
const ENV_FILE = "../../apps/web/.env.production"
if (!existsSync(ENV_FILE)) throw new Error(`${ENV_FILE} not found -- drizzle-kit migrate --config drizzle.config.production.ts requires it`)
process.loadEnvFile(ENV_FILE)
if (!process.env.DATABASE_URL) throw new Error(`DATABASE_URL is not set in ${ENV_FILE}`)

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL },
})
