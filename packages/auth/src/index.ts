import { and, eq, gt, isNull, lt, session as sessionTable, user, type Db } from "@workspace/db"

import { createBetterAuth, type AuthConfig } from "./better-auth"
import {
  createOrganization,
  ensurePersonalOrganization,
  leaveOrganization,
  listMemberOrganizations,
  listMembers,
  removeMember,
  setMemberRole,
  transferOwnership,
  markOrganizationDeleted,
  resolveActiveOrganization,
  type ActiveOrganization,
  type InTx,
} from "./organizations"

type MemberInfo = { userId: string; role: string }

export { ORG_ROLES, type OrgRole } from "./access"
export { INVITATION_HOURS, PASSWORD_RESET_MINUTES, SIGN_IN_CODE_MINUTES, type AuthConfig } from "./better-auth"
export { MemberError, personalOrgName, type ActiveOrganization, type InTx } from "./organizations"

export type AuthSession = {
  user: { id: string; name: string; email: string; image: string | null }
  session: { id: string; token: string; activeOrganizationId: string | null; impersonatedBy: string | null }
}

export class OrgError extends Error {
  constructor(public code: string) {
    super(code)
    this.name = "OrgError"
  }
}

function toAuthSession(data: {
  user: { id: string; name: string; email: string; image?: string | null }
  session: { id: string; token: string; activeOrganizationId?: string | null; impersonatedBy?: string | null }
}): AuthSession {
  return {
    user: { id: data.user.id, name: data.user.name, email: data.user.email, image: data.user.image ?? null },
    session: {
      id: data.session.id,
      token: data.session.token,
      activeOrganizationId: data.session.activeOrganizationId ?? null,
      impersonatedBy: data.session.impersonatedBy ?? null,
    },
  }
}

// The only boundary other packages may call through: no Better Auth instance, api, options or type
// ever escapes this file.
export function createAuth(c: AuthConfig) {
  const raw = createBetterAuth(c)

  async function getSession({ headers, responseHeaders }: { headers: Headers; responseHeaders?: Headers }): Promise<AuthSession | null> {
    // On a database miss Better Auth emits Set-Cookie values expiring the session cookies; callers
    // forward them so the browser drops a refused session.
    const { headers: setHeaders, response } = await raw.api.getSession({ headers, query: { disableCookieCache: true }, returnHeaders: true })
    // A banned user (their own session or one impersonating them) is refused outright, and a session
    // a racing sign-in committed after a ban is deleted here. An impersonation lives only while its
    // admin holds a session older than it: revoke, ban and sign out everywhere delete all of those.
    const banned = response?.user.banned && (!response.user.banExpires || new Date(response.user.banExpires) > new Date())
    const impersonatedBy = response?.session.impersonatedBy
    if (response && (banned || (impersonatedBy && !(await hasOlderAdminSession(impersonatedBy, new Date(response.session.createdAt)))))) {
      await c.db.delete(sessionTable).where(eq(sessionTable.id, response.session.id))
      return getSession({ headers, responseHeaders })
    }
    for (const value of setHeaders?.getSetCookie() ?? []) responseHeaders?.append("set-cookie", value)
    return response ? toAuthSession(response) : null
  }

  async function hasOlderAdminSession(adminId: string, before: Date): Promise<boolean> {
    const [row] = await c.db
      .select({ id: sessionTable.id })
      .from(sessionTable)
      .where(and(eq(sessionTable.userId, adminId), isNull(sessionTable.impersonatedBy), gt(sessionTable.expiresAt, new Date()), lt(sessionTable.createdAt, before)))
      .limit(1)
    return Boolean(row)
  }

  // Membership is always read from the DB on every request. A person left with no workspace (theirs
  // was deleted, or they were removed) gets a new personal one, as at the start of a session.
  async function getActiveOrganization(session: AuthSession): Promise<ActiveOrganization | null> {
    const resolved =
      (await resolveActiveOrganization(c.db, session.user.id, session.session.activeOrganizationId)) ?? (await ensurePersonalOrganization(c.db, session.user))
    if (resolved && resolved.id !== session.session.activeOrganizationId) {
      // The session pointed at a workspace the person no longer belongs to: repair it.
      await c.db.update(sessionTable).set({ activeOrganizationId: resolved.id }).where(eq(sessionTable.id, session.session.id))
    }
    return resolved
  }

  return {
    getSession,

    handleRequest(req: Request): Promise<Response> {
      return raw.handler(req)
    },

    // Always a fresh read -- never trusted from the session.
    async hasRole(userId: string, role: "user" | "admin"): Promise<boolean> {
      const [row] = await c.db.select({ role: user.role }).from(user).where(eq(user.id, userId))
      return row?.role === role
    },

    isImpersonating(session: AuthSession): boolean {
      return session.session.impersonatedBy !== null
    },

    getActiveOrganization,

    listOrganizations(userId: string): Promise<ActiveOrganization[]> {
      return listMemberOrganizations(c.db, userId)
    },

    createOrganization(person: { id: string; name: string; email: string }, name: string, inTx?: InTx<ActiveOrganization>): Promise<ActiveOrganization> {
      return createOrganization(c.db, person, name, inTx)
    },

    // Also records it as the person's last used workspace, which a new session starts in.
    async setActiveOrganization(session: AuthSession, orgId: string): Promise<void> {
      await c.db.update(sessionTable).set({ activeOrganizationId: orgId }).where(eq(sessionTable.id, session.session.id))
      await c.db.update(user).set({ lastActiveOrganizationId: orgId }).where(eq(user.id, session.user.id))
    },

    listMembers: (orgId: string) => listMembers(c.db, orgId),
    removeMember: (orgId: string, memberId: string, inTx?: InTx<MemberInfo>) => removeMember(c.db, orgId, memberId, inTx),
    setMemberRole: (orgId: string, memberId: string, role: "admin" | "member", inTx?: InTx<MemberInfo>) => setMemberRole(c.db, orgId, memberId, role, inTx),
    transferOwnership: (orgId: string, ownerUserId: string, memberId: string, inTx?: InTx<MemberInfo>) => transferOwnership(c.db, orgId, ownerUserId, memberId, inTx),
    // After leaving, the session moves to another workspace, or a new personal one if none is left.
    async leaveOrganization(session: AuthSession, orgId: string): Promise<ActiveOrganization> {
      await leaveOrganization(c.db, orgId, session.user.id)
      const next = await ensurePersonalOrganization(c.db, session.user)
      await c.db.update(sessionTable).set({ activeOrganizationId: next.id }).where(eq(sessionTable.id, session.session.id))
      return next
    },

    softDeleteOrganization(orgId: string, inTx?: InTx<null>): Promise<void> {
      return markOrganizationDeleted(c.db, orgId, inTx)
    },

    // The same fields Better Auth's admin plugin reads at every sign-in, written here so the caller's
    // audit entry commits with them. All the user's sessions go in the same transaction; a temporary
    // ban lifts by itself at expiresAt.
    async banUser(userId: string, opts: { reason: string; expiresAt: Date | null }, inTx?: InTx<null>): Promise<void> {
      await c.db.transaction(async (trx) => {
        const tx = trx as unknown as Db
        await tx.update(user).set({ banned: true, banReason: opts.reason, banExpires: opts.expiresAt }).where(eq(user.id, userId))
        await tx.delete(sessionTable).where(eq(sessionTable.userId, userId))
        await inTx?.(tx, null)
      })
    },

    async unbanUser(userId: string, inTx?: InTx<null>): Promise<void> {
      await c.db.transaction(async (trx) => {
        const tx = trx as unknown as Db
        await tx.update(user).set({ banned: false, banReason: null, banExpires: null }).where(eq(user.id, userId))
        await inTx?.(tx, null)
      })
    },

    // Only the fields a caller needs; no raw Better Auth session row escapes.
    async listUserSessions(userId: string): Promise<{ id: string; createdAt: Date; updatedAt: Date; userAgent: string | null; country: string | null; impersonatedBy: string | null }[]> {
      const rows = await c.db.select().from(sessionTable).where(and(eq(sessionTable.userId, userId), gt(sessionTable.expiresAt, new Date())))
      return rows.map((s) => ({ id: s.id, createdAt: s.createdAt, updatedAt: s.updatedAt, userAgent: s.userAgent, country: s.country, impersonatedBy: s.impersonatedBy }))
    },

    async revokeSession(userId: string, sessionId: string, inTx?: InTx<null>): Promise<boolean> {
      return c.db.transaction(async (trx) => {
        const tx = trx as unknown as Db
        const rows = await tx.delete(sessionTable).where(and(eq(sessionTable.id, sessionId), eq(sessionTable.userId, userId))).returning({ id: sessionTable.id })
        if (rows.length) await inTx?.(tx, null)
        return rows.length > 0
      })
    },

    async revokeAllSessions(userId: string): Promise<void> {
      await c.db.delete(sessionTable).where(eq(sessionTable.userId, userId))
    },

    // Better Auth's revoke-sessions only deletes the caller's own rows; an impersonation session
    // belongs to its target and carries impersonatedBy = the admin.
    async revokeImpersonationSessions(impersonatorId: string): Promise<void> {
      await c.db.delete(sessionTable).where(eq(sessionTable.impersonatedBy, impersonatorId))
    },
  }
}

export type Auth = ReturnType<typeof createAuth>
export type { Db }
