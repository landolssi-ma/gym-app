import { Hono } from "hono"
import { account, and, eq, gymProfiles } from "@workspace/db"

import { requireUser, type GuardEnv } from "../guards"

export const me = new Hono<GuardEnv>().use(requireUser).get("/", async (c) => {
  const { deps, userId, session } = c.var
  const [isAdmin, [password], [gymProfile]] = await Promise.all([
    deps.auth.hasRole(userId, "admin"),
    deps.db.select({ id: account.id }).from(account).where(and(eq(account.userId, userId), eq(account.providerId, "credential"))).limit(1),
    deps.db.select({ userId: gymProfiles.userId }).from(gymProfiles).where(eq(gymProfiles.userId, userId)).limit(1),
  ])
  return c.json({
    user: session.user,
    isAdmin,
    impersonating: deps.auth.isImpersonating(session),
    hasPassword: !!password,
    profileComplete: !!gymProfile,
  })
})
