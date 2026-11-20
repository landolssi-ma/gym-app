import type { Context, MiddlewareHandler } from "hono"

import { rateLimits, sql, type Db } from "@workspace/db"

import type { AppEnv } from "./index"

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0]

// One atomic INSERT ... ON CONFLICT DO UPDATE is the whole check-and-increment: Postgres resolves
// the conflict server-side, so two concurrent requests can never both pass with one unit left.
// A refused request is still counted, which keeps a flood refused for the rest of the window.
export async function checkAndIncrementRateLimit(
  db: Db | Tx,
  input: { subject: string; bucket: string; limit: number; windowMs: number; now?: Date },
): Promise<{ ok: boolean }> {
  const now = (input.now ?? new Date()).getTime()
  const windowStart = new Date(Math.floor(now / input.windowMs) * input.windowMs)
  const [row] = await db
    .insert(rateLimits)
    .values({ subject: input.subject, bucket: input.bucket, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.subject, rateLimits.bucket, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count })
  return { ok: !!row && row.count <= input.limit }
}

// cf-connecting-ip is set by Cloudflare and cannot be spoofed by the client; x-forwarded-for can.
export function clientIp(c: Context): string {
  return c.req.header("cf-connecting-ip") ?? "unknown"
}

async function hashIp(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`))
  return Array.from(new Uint8Array(digest).slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("")
}

// The signed-in user when a guard has set one, else the client IP (hashed, never stored raw).
export async function rateLimitSubject(c: Context<AppEnv & { Variables: { userId?: string } }>): Promise<string> {
  const userId = c.get("userId")
  return userId ? `user:${userId}` : `ip:${await hashIp(clientIp(c), c.var.deps.config.rateLimitSalt)}`
}

// Over the limit: 429 rate_limited, and the handler (with its side effects) never runs.
export function rateLimit(bucket: string, opts: { limit: number; windowMs: number }): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const subject = await rateLimitSubject(c)
    const { ok } = await checkAndIncrementRateLimit(c.var.deps.db, { subject, bucket, ...opts })
    if (!ok) return c.json({ error: "rate_limited" }, 429)
    await next()
  }
}
