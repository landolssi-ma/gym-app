import { Hono } from "hono"
import { z } from "zod"

import { and, eq, inArray, member, ne, user } from "@workspace/db"

import { auditActor } from "../audit"
import { forbidWhileImpersonating, requireUser, type GuardEnv } from "../guards"
import { json } from "../validate"
import { deleteOrganization } from "./organizations"

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
  // Refused while the user owns a workspace with other members: they transfer it or delete it first.
  .post("/delete", forbidWhileImpersonating, json(z.object({ confirm: z.string() })), async (c) => {
    const { deps, userId, session } = c.var
    // Exact match, no normalization.
    if (c.req.valid("json").confirm !== session.user.email) return c.json({ error: "confirm_mismatch" }, 400)
    const owned = (await deps.db.select({ id: member.organizationId }).from(member).where(and(eq(member.userId, userId), eq(member.role, "owner")))).map((r) => r.id)
    if (owned.length) {
      const [shared] = await deps.db.select({ id: member.id }).from(member).where(and(inArray(member.organizationId, owned), ne(member.userId, userId))).limit(1)
      if (shared) return c.json({ error: "owns_organization_with_members" }, 409)
    }
    for (const orgId of owned) await deleteOrganization(deps, orgId, auditActor(c))
    // Sessions, sign-in methods and memberships cascade with the user row.
    await deps.db.delete(user).where(eq(user.id, userId))
    return c.json({ ok: true })
  })

