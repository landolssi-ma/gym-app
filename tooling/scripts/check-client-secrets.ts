// Builds and previews apps/web with a sentinel value in every secret config key, then fails if any
// sentinel shows up in the client bundle or a rendered page. Prints key names only.
// Usage: pnpm check:secrets [--port 5180]
import { spawn, spawnSync } from "node:child_process"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { ApiEnvKeys } from "@workspace/api/bootstrap"

const WEB = new URL("../../apps/web/", import.meta.url).pathname
const port = Number(process.argv[process.argv.indexOf("--port") + 1]) || 5180
const origin = `http://localhost:${port}`

// Config the browser is meant to see (getPublicConfig in apps/web/lib/config.ts).
const PUBLIC = new Set(["APP_ORIGIN", "POSTHOG_KEY", "POSTHOG_HOST"])
// Values that are not strings a sentinel can stand in for, or are not secret.
const fixed: Record<string, string> = {
  APP_ORIGIN: origin,
  POSTHOG_HOST: "https://posthog-sentinel-public.test",
  POSTHOG_KEY: "phc_sentinel_public",
  // Not secret, and must be a provider/model id or AI turns off and its key goes unused.
  AI_MODEL: "sentinel/ai-model",
  S3_ENDPOINT: "https://s3.test",
  MAIL_API_URL: "https://mail.test",
  CMS_PROVIDER: "basehub",
  CMS_API_URL: "https://cms.test/graphql",
  INNGEST_DEV: "1",
}
const sentinel = (key: string) => `sentinel-${key.toLowerCase().replaceAll("_", "-")}-0000000000000000`
const dbPassword = sentinel("database_password")

// Every other schema key that accepts a plain string is treated as secret, so a key added later
// is covered without editing this script.
const secrets: Record<string, string> = {}
for (const [key, schema] of Object.entries(ApiEnvKeys.shape)) {
  if (key in fixed || key === "HYPERDRIVE") continue
  if (PUBLIC.has(key)) throw new Error(`${key} is public but has no fixed value here`)
  if (!schema.safeParse(sentinel(key)).success) throw new Error(`${key}: give it a fixed value or make the sentinel valid for it`)
  secrets[key] = sentinel(key)
}
const databaseUrl = `postgres://postgres:${dbPassword}@127.0.0.1:5433/postgres`
const env = {
  // A minimal environment: with CLOUDFLARE_INCLUDE_PROCESS_ENV the preview Worker receives every
  // process variable, so nothing from the caller's shell may leak in.
  PATH: process.env.PATH!,
  HOME: process.env.HOME!,
  CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
  ...fixed,
  ...secrets,
  CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE: databaseUrl,
}
const needles = new Map<string, string>([...Object.entries(secrets), ["DATABASE_URL password", dbPassword]])

function findLeaks(text: string): string[] {
  return [...needles].filter(([, value]) => text.includes(value)).map(([key]) => key)
}

const failures: string[] = []

const build = spawnSync("pnpm", ["exec", "vite", "build"], { cwd: WEB, env, stdio: ["ignore", "ignore", "inherit"] })
if (build.status !== 0) throw new Error("vite build failed")

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* files(path)
    else yield path
  }
}
for (const file of files(join(WEB, "dist/client"))) {
  for (const key of findLeaks(readFileSync(file, "latin1"))) failures.push(`${key} in ${file.slice(WEB.length)}`)
}

const preview = spawn("pnpm", ["exec", "vite", "preview", "--port", String(port), "--strictPort"], { cwd: WEB, env, stdio: "ignore", detached: true })
try {
  let home = ""
  for (let i = 0; i < 60 && !home; i++) {
    home = await fetch(origin).then((r) => (r.ok ? r.text() : ""), () => "")
    if (!home) await new Promise((r) => setTimeout(r, 1000))
  }
  if (!home) throw new Error(`preview did not answer 200 at ${origin}`)
  // Positive control: the public values must arrive, which proves the sentinel env reached the
  // Worker (a .dev.vars file, for example, would replace it and make every check pass vacuously).
  if (!home.includes(fixed.POSTHOG_KEY!)) throw new Error("public config did not reach the page: the sentinel env was not used")
  // The home page plus every same-origin page it links to.
  const paths = new Set(["/", ...[...home.matchAll(/href="(\/[^"#?]*)/g)].map((m) => m[1]!).filter((p) => !p.startsWith("/_next/"))])
  for (const path of paths) {
    const page = path === "/" ? home : await fetch(origin + path).then((r) => r.text())
    for (const key of findLeaks(page)) failures.push(`${key} in rendered page ${path}`)
  }
  console.log(`checked ${paths.size} page(s) and the client bundle for ${needles.size} secret value(s)`)
} finally {
  process.kill(-preview.pid!)
}

if (failures.length) {
  console.error(`Secret config reached the browser:\n  ${failures.join("\n  ")}`)
  process.exit(1)
}
console.log("no secret reached the browser")
