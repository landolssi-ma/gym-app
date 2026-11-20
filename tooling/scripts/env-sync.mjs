// Rewrites env files into apps/web/.env.example's order, sections and comments, keeping each
// file's own values. Prints key names only, never values.
// Usage: node tooling/scripts/env-sync.mjs apps/web/.env apps/web/.env.production
import { readFileSync, writeFileSync } from "node:fs"

const KEY = /^([A-Z0-9_]+)=/
const example = readFileSync(new URL("../../apps/web/.env.example", import.meta.url), "utf8").split("\n")

for (const file of process.argv.slice(2)) {
  const values = new Map()
  for (const line of readFileSync(file, "utf8").replace(/\r/g, "").split("\n")) {
    const m = KEY.exec(line)
    if (m) values.set(m[1], line.slice(m[1].length + 1))
  }
  const missing = []
  const out = example.map((line) => {
    const m = KEY.exec(line)
    if (!m) return line
    if (!values.has(m[1])) return missing.push(m[1]), `# ${line}`
    const value = values.get(m[1])
    values.delete(m[1])
    return `${m[1]}=${value}`
  })
  if (values.size) out.push("# ── Extra (not in .env.example) ────────────────────", ...[...values].map(([k, v]) => `${k}=${v}`), "")
  writeFileSync(file, out.join("\n"))
  console.log(`${file}: ok${missing.length ? `; missing (left commented with example value): ${missing.join(", ")}` : ""}${values.size ? `; extra kept at end: ${[...values.keys()].join(", ")}` : ""}`)
}
