import { afterAll, describe, expect, test } from "vitest"

import { and, eq, isNull, session, user } from "@workspace/db"
import { TEST_PG_URL } from "@workspace/db/testing"

import { requireUser, type GuardEnv } from "../src/guards"
import { createPgApp } from "./helpers/pg-app"

// A real revoke and a real ban through Better Auth, the facade, the guards and createApi --
// getSession is never stubbed.
describe.skipIf(!TEST_PG_URL)("revoked and banned sessions against real Postgres", () => {
  const t = TEST_PG_URL ? createPgApp() : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  // A guarded route standing in for every requireUser route.
  t.app?.get("/api/probe", requireUser, (c) => c.json({ userId: (c as unknown as { var: GuardEnv["Variables"] }).var.userId }))
  const me = (cookie: string) => t.call("/api/probe", { cookie })

  async function expectAuthEndpointsRefuse(jar: string) {
    expect((await t.call("/api/me", { cookie: jar })).status).toBe(401)
    expect((await t.call("/api/auth/update-user", { method: "POST", body: { name: "x" }, cookie: jar })).status).toBe(401)
  }

  test("revoke: the old cookie is refused on the very next request and the 401 expires it", async () => {
    const jar = await t.signIn(t.email("revoke"))
    expect((await me(jar)).status).toBe(200)
    const revoke = await t.call("/api/auth/revoke-sessions", { method: "POST", body: {}, cookie: jar })
    expect(revoke.status).toBe(200)
    expect(t.expiresSessionToken(revoke)).toBe(true)
    // No cookie cache: Better Auth's own get-session already answers null.
    expect(await (await t.call("/api/auth/get-session", { cookie: jar })).json()).toBeNull()
    const refused = await me(jar)
    expect(refused.status).toBe(401)
    expect(await refused.json()).toEqual({ error: "unauthorized" })
    expect(t.expiresSessionToken(refused)).toBe(true)
    await expectAuthEndpointsRefuse(jar)
  })

  test("ban: the victim's sessions are refused on the very next request", async () => {
    const victimEmail = t.email("victim")
    const victimJar = await t.signIn(victimEmail)
    const [victim] = await t.db.select({ id: user.id }).from(user).where(eq(user.email, victimEmail))
    await t.auth.banUser(victim!.id, { reason: "test", expiresAt: null })
    const refused = await me(victimJar)
    expect(refused.status).toBe(401)
    expect(t.expiresSessionToken(refused)).toBe(true)
    await expectAuthEndpointsRefuse(victimJar)
  })

  test("a session that outlives its user's ban is refused and deleted (race)", async () => {
    const victimEmail = t.email("banrace")
    const jar = await t.signIn(victimEmail)
    // The race's outcome: the ban committed but a sign-in's session row committed after it.
    const [victim] = await t.db.update(user).set({ banned: true }).where(eq(user.email, victimEmail)).returning({ id: user.id })
    expect((await me(jar)).status).toBe(401)
    expect(await t.db.select({ id: session.id }).from(session).where(eq(session.userId, victim!.id))).toEqual([])
  })

  test("a session outliving its ban is also deleted before Better Auth's own endpoints act on it", async () => {
    const victimEmail = t.email("banrace2")
    const jar = await t.signIn(victimEmail)
    await t.db.update(user).set({ banned: true }).where(eq(user.email, victimEmail))
    expect((await t.call("/api/auth/update-user", { method: "POST", body: { name: "renamed" }, cookie: jar })).status).toBe(401)
    const [row] = await t.db.select({ name: user.name }).from(user).where(eq(user.email, victimEmail))
    expect(row!.name).not.toBe("renamed")
  })

  test("admin sign-out-everywhere ends the impersonation sessions they started", async () => {
    const adminEmail = t.email("impadmin")
    await t.db.insert(user).values({ id: `admin-${crypto.randomUUID()}`, name: "Admin", email: adminEmail, role: "admin", emailVerified: true })
    const adminA = await t.signIn(adminEmail)
    const adminB = await t.signIn(adminEmail)
    const victimEmail = t.email("impvictim")
    await t.signIn(victimEmail)
    const [victim] = await t.db.select({ id: user.id }).from(user).where(eq(user.email, victimEmail))
    const started = await t.call("/api/auth/admin/impersonate-user", { method: "POST", body: { userId: victim!.id }, cookie: adminA })
    expect(started.status).toBe(200)
    const impersonation = t.jarFrom(started)
    expect((await me(impersonation)).status).toBe(200)
    expect((await t.call("/api/auth/revoke-sessions", { method: "POST", body: {}, cookie: adminB })).status).toBe(200)
    expect((await me(impersonation)).status).toBe(401)
  })

  test("an impersonator cannot revoke the target's sessions", async () => {
    const adminEmail = t.email("impadmin2")
    await t.db.insert(user).values({ id: `admin-${crypto.randomUUID()}`, name: "Admin", email: adminEmail, role: "admin", emailVerified: true })
    const admin = await t.signIn(adminEmail)
    const victimEmail = t.email("impvictim2")
    const victimJar = await t.signIn(victimEmail)
    const [victim] = await t.db.select({ id: user.id }).from(user).where(eq(user.email, victimEmail))
    const impersonation = t.jarFrom(await t.call("/api/auth/admin/impersonate-user", { method: "POST", body: { userId: victim!.id }, cookie: admin }))
    const refused = await t.call("/api/auth/revoke-sessions", { method: "POST", body: {}, cookie: impersonation })
    expect(refused.status).toBe(403)
    expect(await refused.json()).toEqual({ error: "impersonating" })
    expect((await me(victimJar)).status).toBe(200)
  })

  test("an impersonation row that outlives every older admin session is refused and deleted (race)", async () => {
    const adminEmail = t.email("raceadmin")
    const adminId = `admin-${crypto.randomUUID()}`
    await t.db.insert(user).values({ id: adminId, name: "Admin", email: adminEmail, role: "admin", emailVerified: true })
    const admin = await t.signIn(adminEmail)
    const victimEmail = t.email("racevictim")
    await t.signIn(victimEmail)
    const [victim] = await t.db.select({ id: user.id }).from(user).where(eq(user.email, victimEmail))
    const impersonation = t.jarFrom(await t.call("/api/auth/admin/impersonate-user", { method: "POST", body: { userId: victim!.id }, cookie: admin }))
    await t.db.delete(session).where(and(eq(session.userId, adminId), isNull(session.impersonatedBy)))
    await t.signIn(adminEmail)
    expect((await me(impersonation)).status).toBe(401)
    expect(await t.db.select({ id: session.id }).from(session).where(eq(session.impersonatedBy, adminId))).toEqual([])
  })

  test("a stale cookie does not block signing in again, and the new session works", async () => {
    const address = t.email("resign")
    const stale = await t.signIn(address)
    expect((await t.call("/api/auth/revoke-sessions", { method: "POST", body: {}, cookie: stale })).status).toBe(200)
    const fresh = await t.signIn(address, stale)
    expect((await t.call("/api/me", { cookie: fresh })).status).toBe(200)
    expect((await me(fresh)).status).toBe(200)
  })

  test("Better Auth admin endpoints outside the allowlist stay closed", async () => {
    const jar = await t.signIn(t.email("closed"))
    expect((await t.call("/api/auth/admin/list-users", { cookie: jar })).status).toBe(404)
  })

  // Measures the added cost of reading every session from the database (no cookie cache).
  test("session read cost", async () => {
    const jar = await t.signIn(t.email("timing"))
    const headers = new Headers({ cookie: jar })
    for (let i = 0; i < 5; i++) await t.auth.getSession({ headers })
    const runs = 50
    const start = performance.now()
    for (let i = 0; i < runs; i++) await t.auth.getSession({ headers })
    const ms = (performance.now() - start) / runs
    console.log(`getSession: ${ms.toFixed(2)} ms average over ${runs} reads`)
    expect(ms).toBeLessThan(50)
  })
})
