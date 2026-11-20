import type { Context, MiddlewareHandler } from "hono"

import type { Ai } from "@workspace/ai"
import type { ActiveOrganization, AuthSession, OrgRole } from "@workspace/auth"

import type { AppEnv } from "./index"

export type GuardEnv = {
  Variables: AppEnv["Variables"] & { userId: string; session: AuthSession; orgId: string; orgRole: OrgRole; org: ActiveOrganization; adminId: string; ai: Ai }
}

// A refused session's cookie is expired on the same response.
export async function readSession<E extends AppEnv>(c: Context<E>): Promise<AuthSession | null> {
  const responseHeaders = new Headers()
  const session = await c.var.deps.auth.getSession({ headers: c.req.raw.headers, responseHeaders })
  if (!session) for (const value of responseHeaders.getSetCookie()) c.header("Set-Cookie", value, { append: true })
  return session
}

export const requireUser: MiddlewareHandler<GuardEnv> = async (c, next) => {
  const s = await readSession(c)
  if (!s) return c.json({ error: "unauthorized" }, 401)
  c.set("userId", s.user.id)
  c.set("session", s)
  await next()
}

// For actions that change credentials, sessions, membership, billing or account existence.
export const forbidWhileImpersonating: MiddlewareHandler<GuardEnv> = async (c, next) => {
  if (c.var.deps.auth.isImpersonating(c.var.session)) return c.json({ error: "impersonating" }, 403)
  await next()
}

// The active workspace comes from the session and membership is re-checked on every request. The
// x-org-id header only detects a stale tab: it never selects which workspace is read or written.
function activeOrgGuard(opts: { allowSuspended?: boolean } = {}): MiddlewareHandler<GuardEnv> {
  return async (c, next) => {
    const { deps, session } = c.var
    const org = await deps.auth.getActiveOrganization(session)
    if (!org) return c.json({ error: "no_organization" }, 403)
    const header = c.req.header("x-org-id")
    if (header && header !== org.id) return c.json({ error: "org_changed" }, 409)
    if (org.suspended && !opts.allowSuspended) return c.json({ error: "org_suspended" }, 403)
    c.set("orgId", org.id)
    c.set("orgRole", org.role)
    c.set("org", org)
    await next()
  }
}

export const requireActiveOrg = activeOrgGuard()
// Only for the routes a member of a suspended workspace needs to see the notice and switch away.
export const requireActiveOrgAllowSuspended = activeOrgGuard({ allowSuspended: true })

// A role refusal is 403 forbidden; 404 stays reserved for ids outside the active workspace.
export function requireOrgRole(...roles: OrgRole[]): MiddlewareHandler<GuardEnv> {
  return async (c, next) => {
    if (!roles.includes(c.var.orgRole)) return c.json({ error: "forbidden" }, 403)
    await next()
  }
}

// The platform admin role is always a fresh database read, never taken from the session.
export const requireAdmin: MiddlewareHandler<GuardEnv> = async (c, next) => {
  if (!(await c.var.deps.auth.hasRole(c.var.userId, "admin"))) return c.json({ error: "forbidden" }, 403)
  c.set("adminId", c.var.userId)
  await next()
}

// After requireUser and requireActiveOrg, before any rate limit, meter or model call, so a request
// to an unconfigured AI feature costs nothing.
export const requireAi: MiddlewareHandler<GuardEnv> = async (c, next) => {
  const { ai } = c.var.deps
  if (!ai) return c.json({ error: "ai_unavailable" }, 503)
  c.set("ai", ai)
  await next()
}
