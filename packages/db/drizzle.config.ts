import { existsSync } from "node:fs"
import { defineConfig } from "drizzle-kit"

// One env file for the whole app: DATABASE_URL lives in apps/web/.env (shell vars still win).
if (existsSync("../../apps/web/.env")) process.loadEnvFile("../../apps/web/.env")

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
})
