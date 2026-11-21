import { Hono } from "hono"
import { z } from "zod"

import { eq, files, user } from "@workspace/db"

import { forbidWhileImpersonating, requireUser, type GuardEnv } from "../guards"
import { json } from "../validate"

// The signed-in user's own sessions. Sign out everywhere is Better Auth's /api/auth/revoke-sessions.
export const account = new Hono<GuardEnv>()
  .use(requireUser)
  // last active is the session's updatedAt, which Better Auth refreshes at most once a day.
  .get("/sessions", async (c) => {
    const sessions = await c.var.deps.auth.listUserSessions(c.var.userId)
    return c.json({
      sessions: sessions
        .filter((s) => !s.impersonatedBy)
        .map((s) => ({ id: s.id, userAgent: s.userAgent, country: s.country, createdAt: s.createdAt, lastActiveAt: s.updatedAt, current: s.id === c.var.session.session.id })),
    })
  })
  .delete("/sessions/:id", forbidWhileImpersonating, async (c) => {
    const revoked = await c.var.deps.auth.revokeSession(c.var.userId, c.req.param("id"))
    return revoked ? c.json({ ok: true }) : c.json({ error: "not_found" }, 404)
  })
  .post("/delete", forbidWhileImpersonating, json(z.object({ confirm: z.string() })), async (c) => {
    const { deps, userId, session } = c.var
    if (c.req.valid("json").confirm !== session.user.email) return c.json({ error: "confirm_mismatch" }, 400)
    const ownedFiles = await deps.db.select({ key: files.key, visibility: files.visibility }).from(files).where(eq(files.userId, userId))
    await Promise.all(ownedFiles.map((file) => deps.storage.delete(file.visibility, file.key)))
    await deps.db.delete(user).where(eq(user.id, userId))
    return c.json({ ok: true })
  })

