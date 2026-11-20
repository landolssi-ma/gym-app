#!/usr/bin/env node
// Smoke harness. Origin and token come from an env file: APP_ORIGIN, SMOKE_TOKEN.
// Local:    node smoke.mjs --local                         (reads apps/web/.env, starts the dev server)
// Deployed: node smoke.mjs --env-file apps/web/.env.production
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import http from "node:http"
import https from "node:https"
import { parseArgs } from "node:util"

const { values: args } = parseArgs({
  options: {
    "env-file": { type: "string", default: new URL("../../apps/web/.env", import.meta.url).pathname },
    local: { type: "boolean", default: false },
  },
})
if (existsSync(args["env-file"])) process.loadEnvFile(args["env-file"])
const app = process.env.APP_ORIGIN
const token = process.env.SMOKE_TOKEN
if (!app || !token) {
  console.error("usage: smoke.mjs [--local] [--env-file FILE]  (needs APP_ORIGIN and SMOKE_TOKEN)")
  process.exit(2)
}

// --local always connects to localhost (vite may bind ::1 only).
function request(method, path, headers = {}, body) {
  const u = new URL(path, app)
  const lib = u.protocol === "https:" ? https : http
  return new Promise((resolve, reject) => {
    const req = lib.request(
      { hostname: args.local ? "localhost" : u.hostname, port: u.port || undefined, path: u.pathname + u.search, method, headers: { host: u.host, ...headers }, servername: u.hostname },
      (res) => {
        let body = ""
        res.setEncoding("utf8")
        res.on("data", (c) => (body += c))
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }))
      },
    )
    req.setTimeout(30_000, () => req.destroy(new Error("timeout")))
    req.on("error", reject)
    req.end(body)
  })
}

const get = (path, headers) => request("GET", path, headers)
const tok = { "x-smoke-token": token }
const expect = (r, status) => {
  if (r.status !== status) throw new Error(`status ${r.status}, want ${status}`)
}

// Each probe returns a detail string on success and throws on failure.
const probes = [
  {
    id: "health",
    async run() {
      const r = await get("/api/health", tok)
      expect(r, 200)
      const j = JSON.parse(r.body)
      if (j.db !== true || j.fresh !== true) throw new Error(`body ${r.body}`)
      return "/api/health db:true fresh:true"
    },
  },
  {
    id: "health-no-token",
    async run() {
      const r = await get("/api/health")
      expect(r, 404)
      if (!r.headers["content-type"]?.startsWith("application/json")) throw new Error(`content-type ${r.headers["content-type"]}`)
      return "/api/health without token 404 JSON"
    },
  },
  {
    id: "cross-origin",
    async run() {
      expect(await request("POST", "/api/health", { origin: "https://evil.example", "content-type": "application/json" }, "{}"), 403)
      return "POST from another origin 403"
    },
  },
  {
    id: "duplicate-cookie",
    async run() {
      const cookie = "__Host-acme.session_token=a; __Host-acme.session_token=b"
      expect(await get("/api/health", { ...tok, cookie }), 400)
      return "duplicate auth cookie 400"
    },
  },
]
// Deployed only: needs the real PostHog key and the real bucket.
const deployedProbes = [
  {
    id: "bucket-cors",
    async run() {
      // Browsers PUT uploads straight to the bucket, so it must answer this preflight (README: bucket CORS rule).
      const r = await fetch(`${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/private/smoke-cors`, {
        method: "OPTIONS",
        headers: { origin: app, "access-control-request-method": "PUT", "access-control-request-headers": "content-type" },
      })
      const allowed = r.headers.get("access-control-allow-origin")
      if (!r.ok || (allowed !== app && allowed !== "*") || !/\bPUT\b/i.test(r.headers.get("access-control-allow-methods") ?? ""))
        throw new Error(`preflight ${r.status}, allow-origin ${allowed ?? "none"}: add the bucket CORS rule from the README`)
      return `bucket allows PUT from ${app}`
    },
  },
  {
    id: "analytics",
    async run() {
      const r = await get("/api/health/analytics", tok)
      expect(r, 200)
      if (JSON.parse(r.body).analytics !== true) throw new Error(`body ${r.body}`)
      return "/api/health/analytics analytics:true"
    },
  },
]

let child
if (args.local) {
  child = spawn("pnpm", ["--filter", "web", "dev"], { detached: true, stdio: "ignore" })
  const deadline = Date.now() + 120_000
  for (;;) {
    try {
      await get("/")
      break
    } catch {
      if (Date.now() > deadline || child.exitCode !== null) {
        console.log("FAIL boot dev server not reachable within 120 s")
        stop()
        process.exit(1)
      }
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
}

function stop() {
  if (child?.exitCode === null) {
    try {
      process.kill(-child.pid, "SIGTERM")
    } catch {}
  }
}

let failed = false
for (const p of args.local ? probes : [...probes, ...deployedProbes]) {
  try {
    console.log(`PASS ${p.id} ${await p.run()}`)
  } catch (e) {
    failed = true
    console.log(`FAIL ${p.id} ${e.message}`)
  }
}
stop()
process.exit(failed ? 1 : 0)
