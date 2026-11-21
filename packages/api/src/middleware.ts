import type { MiddlewareHandler } from "hono"

import type { AppEnv } from "./index"

// Cookie tossing: two auth cookies with the same name (any case) means one was planted by a
// sibling domain to shadow the real session.
export function hasDuplicateAuthCookies(header: string | undefined, cookiePrefix: string): boolean {
  const authPrefix = `${cookiePrefix.toLowerCase()}.`
  const names = (header ?? "")
    .split(";")
    .map((p) => p.split("=")[0]!.trim().toLowerCase())
    .filter((n) => n.startsWith(authPrefix) || n.includes("session_token"))
  return new Set(names).size !== names.length
}

export const noDuplicateAuthCookies = (): MiddlewareHandler<AppEnv> => async (c, next) => {
  if (hasDuplicateAuthCookies(c.req.header("cookie"), c.var.deps.config.cookiePrefix)) return c.json({ error: "duplicate_cookie" }, 400)
  await next()
}

// hono/csrf is not used: it skips application/json bodies. Inngest requests are signature-verified
// instead. Listed as an exact fixed path, never a prefix, so no other path is accidentally exempted.
const ORIGIN_EXEMPT = new Set(["/api/inngest"])

export const exactOrigin = (): MiddlewareHandler<AppEnv> => async (c, next) => {
  const safe = c.req.method === "GET" || c.req.method === "HEAD" || c.req.method === "OPTIONS"
  if (!safe && !ORIGIN_EXEMPT.has(c.req.path) && c.req.header("origin") !== c.var.deps.config.appOrigin)
    return c.json({ error: "forbidden_origin" }, 403)
  await next()
}
