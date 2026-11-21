import { and, eq, gt, isNull, lt, session as sessionTable, user, type Db } from "@workspace/db"

import { createBetterAuth, type AuthConfig } from "./better-auth"

export { PASSWORD_RESET_MINUTES, SIGN_IN_CODE_MINUTES, type AuthConfig } from "./better-auth"

export type AuthSession = {
  user: { id: string; name: string; email: string; image: string | null }
  session: { id: string; token: string; impersonatedBy: string | null }
}

function toAuthSession(data: {
  user: { id: string; name: string; email: string; image?: string | null }
  session: { id: string; token: string; impersonatedBy?: string | null }
}): AuthSession {
  return {
    user: { id: data.user.id, name: data.user.name, email: data.user.email, image: data.user.image ?? null },
    session: { id: data.session.id, token: data.session.token, impersonatedBy: data.session.impersonatedBy ?? null },
  }
}

export function createAuth(c: AuthConfig) {
  const raw = createBetterAuth(c)

  async function getSession({ headers, responseHeaders }: { headers: Headers; responseHeaders?: Headers }): Promise<AuthSession | null> {
    const { headers: setHeaders, response } = await raw.api.getSession({ headers, query: { disableCookieCache: true }, returnHeaders: true })
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

  return {
    getSession,
    handleRequest(req: Request): Promise<Response> {
      return raw.handler(req)
    },
    async hasRole(userId: string, role: "user" | "admin"): Promise<boolean> {
      const [row] = await c.db.select({ role: user.role }).from(user).where(eq(user.id, userId))
      return row?.role === role
    },
    isImpersonating(session: AuthSession): boolean {
      return session.session.impersonatedBy !== null
    },
    async banUser(userId: string, opts: { reason: string; expiresAt: Date | null }, inTx?: (tx: Db, value: null) => void | Promise<void>): Promise<void> {
      await c.db.transaction(async (trx) => {
        const tx = trx as unknown as Db
        await tx.update(user).set({ banned: true, banReason: opts.reason, banExpires: opts.expiresAt }).where(eq(user.id, userId))
        await tx.delete(sessionTable).where(eq(sessionTable.userId, userId))
        await inTx?.(tx, null)
      })
    },
    async unbanUser(userId: string, inTx?: (tx: Db, value: null) => void | Promise<void>): Promise<void> {
      await c.db.transaction(async (trx) => {
        const tx = trx as unknown as Db
        await tx.update(user).set({ banned: false, banReason: null, banExpires: null }).where(eq(user.id, userId))
        await inTx?.(trx as unknown as Db, null)
      })
    },
    async listUserSessions(userId: string): Promise<{ id: string; createdAt: Date; updatedAt: Date; userAgent: string | null; country: string | null; impersonatedBy: string | null }[]> {
      const rows = await c.db.select().from(sessionTable).where(and(eq(sessionTable.userId, userId), gt(sessionTable.expiresAt, new Date())))
      return rows.map((s) => ({ id: s.id, createdAt: s.createdAt, updatedAt: s.updatedAt, userAgent: s.userAgent, country: s.country, impersonatedBy: s.impersonatedBy }))
    },
    async revokeSession(userId: string, sessionId: string, inTx?: (tx: Db, value: null) => void | Promise<void>): Promise<boolean> {
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
    async revokeImpersonationSessions(impersonatorId: string): Promise<void> {
      await c.db.delete(sessionTable).where(eq(sessionTable.impersonatedBy, impersonatorId))
    },
  }
}

export type Auth = ReturnType<typeof createAuth>
export type { Db }
