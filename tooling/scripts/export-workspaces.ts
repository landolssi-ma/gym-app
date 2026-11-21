import { mkdir, writeFile } from "node:fs/promises"
import { createDb, sql } from "@workspace/db"

process.loadEnvFile(new URL("../../apps/web/.env", import.meta.url).pathname)
const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL is required")
if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname)) {
  throw new Error("export-workspaces refuses a non-local database")
}

const { db, end } = createDb(url)
const tables = ["user", "account", "session", "files", "projects", "audit_logs"]

try {
  const archive: Record<string, unknown[]> = {}
  for (const table of tables) {
    const result = await db.execute(sql.raw(`SELECT * FROM "${table}"`))
    archive[table] = result.rows
  }

  const date = new Date().toISOString().slice(0, 10)
  const outputDir = new URL("../../exports/", import.meta.url)
  await mkdir(outputDir, { recursive: true })
  const output = new URL(`workspace-export-${date}.json`, outputDir)
  await writeFile(output, JSON.stringify({ exportedAt: new Date().toISOString(), tables: archive }, null, 2))
  console.log(output.pathname)
} finally {
  await end()
}
