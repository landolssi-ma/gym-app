import { Hono, type Context, type Next } from "hono"

import { AiError, type Ai } from "@workspace/ai"
import type { Auth, AuthSession } from "@workspace/auth"
import { createLog, type Analytics, type Log } from "@workspace/core"
import type { Db } from "@workspace/db"
import type { Jobs } from "@workspace/jobs"
import type { Mail } from "@workspace/mail"
import type { Storage } from "@workspace/storage"

import { writeAudit } from "./audit"
import { jobFunctions } from "./functions"
import { readSession } from "./guards"
import { exactOrigin, noDuplicateAuthCookies } from "./middleware"
import { account } from "./routes/account"
import { admin } from "./routes/admin"
import { filesRoutes } from "./routes/files"
import { health } from "./routes/health"
import { me } from "./routes/me"
import { projectsRoutes } from "./routes/projects"

export { hasDuplicateAuthCookies } from "./middleware"

export type ApiConfig = {
  appOrigin: string
  smokeToken: string
  rateLimitSalt: string
  cookiePrefix: string
}
export type Deps = {
  config: ApiConfig
  db: Db
  // Lazy getter: built on first use so routes that never touch auth skip its cost.
  auth: Auth
  mail: Mail
  storage: Storage
  jobs: Jobs
  // Absent when PostHog is not configured.
  analytics?: Analytics
  // Absent when AI is not configured; routes reach it through requireAi.
  ai?: Ai
  log: Log
  waitUntil: (p: Promise<unknown>) => void
  close: () => Promise<void>
}
export type AppEnv = { Variables: { deps: Deps } }

const notFound = { error: "not_found" } as const

const REVOKE_PATHS = new Set(["/api/auth/revoke-sessions", "/api/auth/revoke-other-sessions", "/api/auth/revoke-session"])
// Better Auth endpoints that change credentials or account existence: never while impersonating.
const CREDENTIAL_PATHS = new Set(["/api/auth/change-password", "/api/auth/change-email", "/api/auth/set-password", "/api/auth/delete-user", "/api/auth/link-social", "/api/auth/unlink-account"])
const IMPERSONATE = "/api/auth/admin/impersonate-user"
const STOP_IMPERSONATING = "/api/auth/admin/stop-impersonating"

// A single chained expression: chaining is what lets TypeScript infer each mounted route's real
// path and method into the return type (AppRoutes below), which the typed `hc` client reads.
export function createApi(makeDeps: () => Deps) {
  const app = new Hono<AppEnv>()
    .use(async (c, next) => {
      const deps = makeDeps()
      c.set("deps", deps)
      try {
        await next()
      } finally {
        deps.waitUntil(deps.close())
      }
    })
    // Public avatars and logos. Keys are random and their bytes never change, so the response is
    // cacheable forever; nosniff and the image-only check keep an upload from running as a page.
    .get("/media/:key{[0-9a-f-]{36}}", async (c) => {
      const obj = await c.var.deps.storage.get("public", c.req.param("key"))
      if (!obj?.contentType?.startsWith("image/") || obj.contentType === "image/svg+xml") return c.json(notFound, 404)
      return c.body(obj.body, 200, { "content-type": obj.contentType, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" })
    })
    // Next owns every other path outside /api.
    .use(async (c, next) => {
      if (!c.req.path.startsWith("/api/")) return c.json(notFound, 404)
      await next()
    })
    .use(noDuplicateAuthCookies(), exactOrigin())
    .route("/api/health", health)
    // Better Auth's own admin and organization endpoints stay closed except these exact paths; every
    // other admin or workspace action goes through starter routes and their guards.
    .use("/api/auth/admin/*", async (c, next) => {
      if (c.req.path !== "/api/auth/admin/impersonate-user" && c.req.path !== "/api/auth/admin/stop-impersonating") return c.json(notFound, 404)
      await next()
    })
    // With a session cookie, the facade's fresh read runs first: it deletes a session that outlived
    // a ban or its impersonating admin, so Better Auth never acts on one. It never refuses, so a
    // stale cookie cannot block signing in again.
    .use("/api/auth/*", async (c, next) => {
      const session = c.req.header("cookie")?.includes("session_token") ? await readSession(c) : null
      if (CREDENTIAL_PATHS.has(c.req.path) && session && c.var.deps.auth.isImpersonating(session)) return c.json({ error: "impersonating" }, 403)
      if (session && (c.req.path === IMPERSONATE || c.req.path === STOP_IMPERSONATING)) return auditImpersonation(c, next, session)
      if (!REVOKE_PATHS.has(c.req.path)) return next()
      if (!session) return c.json({ error: "unauthorized" }, 401)
      // An impersonator can revoke none of the target's sessions.
      if (c.var.deps.auth.isImpersonating(session)) return c.json({ error: "impersonating" }, 403)
      if (c.req.path !== "/api/auth/revoke-sessions") return next()
      // Sign out everywhere also ends the impersonations this admin started, before and after the
      // revoke (one may start while it runs). The follow-ups never turn a committed revoke into a 5xx.
      await c.var.deps.auth.revokeImpersonationSessions(session.user.id)
      await next()
      if (!c.res.ok) return
      const cleared = new Headers()
      const followups = await Promise.allSettled([
        c.var.deps.auth.revokeImpersonationSessions(session.user.id),
        // Every session row is gone now: the database miss emits the expiring cookies.
        c.var.deps.auth.getSession({ headers: c.req.raw.headers, responseHeaders: cleared }),
      ])
      for (const f of followups) if (f.status === "rejected") c.var.deps.log.error("revoke_sessions_followup", { err: f.reason })
      for (const value of cleared.getSetCookie()) c.header("Set-Cookie", value, { append: true })
    })
    .on(["GET", "POST"], "/api/auth/*", (c) => c.var.deps.auth.handleRequest(c.req.raw))
    .route("/api/account", account)
    .route("/api/me", me)
    .route("/api/files", filesRoutes)
    .route("/api/projects", projectsRoutes)
    .route("/api/admin", admin)
    // Signed by Inngest, so exactOrigin exempts it.
    .on(["GET", "PUT", "POST"], "/api/inngest", (c) => c.var.deps.jobs.serve(jobFunctions(c.var.deps))(c))

  app.notFound((c) => c.json(notFound, 404))
  app.onError((err, c) => {
    // packages/ai already logged it, without the prompt or answer.
    if (err instanceof AiError) return c.json({ error: "ai_failed" }, 502)
    // deps is unset when makeDeps itself threw (e.g. invalid config). The stack stays in the log.
    ;(c.var.deps?.log ?? createLog()).error("unhandled", { err })
    return c.json({ error: "internal" }, 500)
  })
  return app
}

export type AppRoutes = ReturnType<typeof createApi>

// Better Auth creates and ends impersonation sessions itself, so the entry cannot share their
// transaction. Start: written after success, and if it cannot be written the new impersonation
// sessions are deleted and the request fails. shortcut: stop is recorded after it succeeds; a failed
// write fails the request but the impersonation has already ended. Upgrade by moving stop into the facade.
async function auditImpersonation(c: Context<AppEnv>, next: Next, session: AuthSession): Promise<Response | void> {
  const starting = c.req.path === IMPERSONATE
  const targetId = starting ? ((await c.req.raw.clone().json().catch(() => ({}))) as { userId?: string }).userId : session.user.id
  await next()
  if (!c.res.ok || !targetId) return
  const adminId = starting ? session.user.id : session.session.impersonatedBy
  if (!adminId) return
  const { deps } = c.var
  try {
    await writeAudit(deps.db, { actorId: adminId, impersonatorId: null, ip: c.req.header("cf-connecting-ip") ?? null }, { action: starting ? "impersonation.started" : "impersonation.stopped", targetType: "user", targetId })
  } catch (err) {
    if (starting) await deps.auth.revokeImpersonationSessions(adminId)
    throw err
  }
}
