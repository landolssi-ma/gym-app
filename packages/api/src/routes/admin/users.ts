import { Hono } from "hono"
import { z } from "zod"

import { and, desc, eq, gt, ilike, or, session, user } from "@workspace/db"

import { auditActor, writeAudit } from "../../audit"
import type { GuardEnv } from "../../guards"
import { json, valid } from "../../validate"
import { decodeCursor, PAGE_SIZE, pageOf } from "./page"

type Deps = GuardEnv["Variables"]["deps"]

// Every change re-reads the target from the database and never acts on a platform admin or on the
// caller: admins cannot ban or sign out one another.
async function targetGuard(deps: Deps, adminId: string, id: string): Promise<"not_found" | "forbidden" | null> {
  const [row] = await deps.db.select({ role: user.role }).from(user).where(eq(user.id, id))
  if (!row) return "not_found"
  return row.role === "admin" || id === adminId ? "forbidden" : null
}
const refuse = (guard: "not_found" | "forbidden") => [{ error: guard }, guard === "not_found" ? 404 : 403] as const

export const adminUsers = new Hono<GuardEnv>()
  // Search by part of the email or name; an empty search lists everyone, newest first.
  .get("/", valid("query", z.object({ q: z.string().optional(), cursor: z.string().optional() })), async (c) => {
    const { q, cursor } = c.req.valid("query")
    const query = q?.trim()
    const offset = decodeCursor(cursor)
    const rows = await c.var.deps.db
      .select({ id: user.id, name: user.name, email: user.email, role: user.role, banned: user.banned, banExpires: user.banExpires, createdAt: user.createdAt })
      .from(user)
      .where(query ? or(ilike(user.email, `%${query}%`), ilike(user.name, `%${query}%`)) : undefined)
      .orderBy(desc(user.createdAt), desc(user.id))
      .limit(PAGE_SIZE + 1)
      .offset(offset)
    const { items, nextCursor } = pageOf(rows, offset)
    return c.json({ users: items, nextCursor })
  })
  .get("/:id", async (c) => {
    const { db } = c.var.deps
    const id = c.req.param("id")
    const [row] = await db
      .select({ id: user.id, name: user.name, email: user.email, image: user.image, role: user.role, banned: user.banned, banReason: user.banReason, banExpires: user.banExpires, createdAt: user.createdAt })
      .from(user)
      .where(eq(user.id, id))
    if (!row) return c.json({ error: "not_found" }, 404)
    const [sessions] = await Promise.all([
      db
        .select({ id: session.id, createdAt: session.createdAt, updatedAt: session.updatedAt, ipAddress: session.ipAddress, userAgent: session.userAgent, impersonatedBy: session.impersonatedBy })
        .from(session)
        .where(and(eq(session.userId, id), gt(session.expiresAt, new Date())))
        .orderBy(desc(session.updatedAt)),
    ])
    return c.json({ ...row, sessions })
  })
  .post("/:id/ban", json(z.object({ reason: z.string().trim().min(1).max(500), expiresAt: z.iso.datetime().nullable().default(null) })), async (c) => {
    const { deps, adminId } = c.var
    const id = c.req.param("id")
    const guard = await targetGuard(deps, adminId, id)
    if (guard) return c.json(...refuse(guard))
    const { reason, expiresAt } = c.req.valid("json")
    if (expiresAt && new Date(expiresAt) <= new Date()) return c.json({ error: "invalid" }, 400)
    await deps.auth.banUser(id, { reason, expiresAt: expiresAt ? new Date(expiresAt) : null }, (tx) =>
      writeAudit(tx, auditActor(c), { action: "user.banned", targetType: "user", targetId: id, metadata: { reason, expiresAt } }),
    )
    return c.json({ ok: true })
  })
  // The recovery direction: no admin-target restriction.
  .post("/:id/unban", async (c) => {
    const { deps } = c.var
    const id = c.req.param("id")
    const [row] = await deps.db.select({ id: user.id }).from(user).where(eq(user.id, id))
    if (!row) return c.json({ error: "not_found" }, 404)
    await deps.auth.unbanUser(id, (tx) => writeAudit(tx, auditActor(c), { action: "user.unbanned", targetType: "user", targetId: id }))
    return c.json({ ok: true })
  })
  // Only a session of this user: another user's session id is 404, not a stranger signed out.
  .post("/:id/sessions/:sessionId/revoke", async (c) => {
    const { deps, adminId } = c.var
    const id = c.req.param("id")
    const guard = await targetGuard(deps, adminId, id)
    if (guard) return c.json(...refuse(guard))
    const sessionId = c.req.param("sessionId")
    const revoked = await deps.auth.revokeSession(id, sessionId, (tx) =>
      writeAudit(tx, auditActor(c), { action: "session.revoked", targetType: "session", targetId: sessionId, metadata: { userId: id } }),
    )
    return revoked ? c.json({ ok: true }) : c.json({ error: "not_found" }, 404)
  })
