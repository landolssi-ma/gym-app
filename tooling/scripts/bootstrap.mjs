// pnpm bootstrap: brings a fresh clone to a migrated, seeded local database. Safe to run again: it never
// overwrites apps/web/.env or a secret that is already set.
import { execSync } from "node:child_process"
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs"
import { randomBytes } from "node:crypto"

const root = new URL("../../", import.meta.url).pathname
const env = `${root}apps/web/.env`
const run = (cmd) => execSync(cmd, { cwd: root, stdio: "inherit" })

if (!existsSync(env)) {
  copyFileSync(`${root}apps/web/.env.example`, env)
  console.log("created apps/web/.env from .env.example")
}
const content = readFileSync(env, "utf8")
if (/^BETTER_AUTH_SECRET=\s*$/m.test(content)) {
  writeFileSync(env, content.replace(/^BETTER_AUTH_SECRET=\s*$/m, `BETTER_AUTH_SECRET=${randomBytes(32).toString("base64url")}`))
  console.log("generated BETTER_AUTH_SECRET")
}

run("docker compose up -d --wait postgres mailcatcher mail-relay")
run("pnpm db:migrate")
run("pnpm db:seed")
