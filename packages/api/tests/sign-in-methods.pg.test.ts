import { afterAll, afterEach, describe, expect, test, vi } from "vitest"

import { account, eq, member, organization, session, user } from "@workspace/db"
import { TEST_PG_URL } from "@workspace/db/testing"

import { createPgApp, TOKEN } from "./helpers/pg-app"

const sha1 = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s))), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase()

// Email code, password, verification and the takeover protections, through Better Auth, the facade
// and createApi on real Postgres.
describe.skipIf(!TEST_PG_URL)("sign-in methods against real Postgres", () => {
  const t = TEST_PG_URL ? createPgApp() : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  const realFetch = globalThis.fetch
  // Have I Been Pwned answers "not breached" unless a test says otherwise.
  const stubPwned = (breachedHash?: string) =>
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
      String(input).startsWith("https://api.pwnedpasswords.com/range/")
        ? Promise.resolve(new Response(breachedHash ? `${breachedHash.slice(5)}:100\n` : ""))
        : realFetch(input, init),
    )
  afterEach(() => vi.unstubAllGlobals())
  const post = (path: string, body: unknown) => t.call(`/api/auth${path}`, { method: "POST", body })

  test("an emailed 8-digit code signs a new visitor in, with the email verified and a personal workspace", async () => {
    const email = t.email("code")
    expect((await post("/email-otp/send-verification-otp", { email, type: "sign-in" })).status).toBe(200)
    expect(t.codes.get(email)).toMatch(/^\d{8}$/)
    const res = await post("/sign-in/email-otp", { email, otp: t.codes.get(email) })
    expect(res.status).toBe(200)
    expect(res.headers.get("set-cookie")).toContain(`${TOKEN}=`)
    const [u] = await t.db.select().from(user).where(eq(user.email, email))
    expect(u!.emailVerified).toBe(true)
    const orgs = await t.db.select({ noTrial: organization.noTrial, role: member.role }).from(member).innerJoin(organization, eq(organization.id, member.organizationId)).where(eq(member.userId, u!.id))
    expect(orgs).toEqual([{ noTrial: false, role: "owner" }])
    expect(t.verified.filter((id) => id === u!.id)).toHaveLength(1)
  })

  test("a second sign-in creates no second workspace and no second user.created", async () => {
    const email = t.email("twice")
    await t.signIn(email)
    await t.signIn(email)
    const [u] = await t.db.select().from(user).where(eq(user.email, email))
    expect(await t.db.select().from(member).where(eq(member.userId, u!.id))).toHaveLength(1)
    expect(t.verified.filter((id) => id === u!.id)).toHaveLength(1)
  })

  test("five wrong codes invalidate the code", async () => {
    const email = t.email("wrong")
    await post("/email-otp/send-verification-otp", { email, type: "sign-in" })
    const code = t.codes.get(email)!
    const wrong = code === "00000000" ? "11111111" : "00000000"
    for (let i = 0; i < 5; i++) expect((await post("/sign-in/email-otp", { email, otp: wrong })).status).toBe(400)
    expect((await post("/sign-in/email-otp", { email, otp: code })).ok).toBe(false)
  })

  test("password sign-up refuses breached and short passwords, sends a verification email and does not sign in", async () => {
    stubPwned(await sha1("password123"))
    const email = t.email("pw")
    expect((await post("/sign-up/email", { email, password: "password123", name: "pw" })).status).toBe(400)
    expect((await post("/sign-up/email", { email, password: "short1", name: "pw" })).status).toBe(400)
    const ok = await post("/sign-up/email", { email, password: "a-long-unbreached-pass", name: "pw" })
    expect(ok.status).toBe(200)
    expect(ok.headers.getSetCookie().some((c) => c.startsWith(`${TOKEN}=`) && !/max-age=0/i.test(c))).toBe(false)
    expect(t.links.filter((l) => l.kind === "verify" && l.email === email)).toHaveLength(1)
    const [u] = await t.db.select().from(user).where(eq(user.email, email))
    expect(t.verified).not.toContain(u!.id)
  })

  test("password sign-in waits for verification; the link verifies, signs in and announces the user once", async () => {
    stubPwned()
    const email = t.email("verify")
    await post("/sign-up/email", { email, password: "a-long-unbreached-pass", name: "v", callbackURL: "/dashboard" })
    const refused = await post("/sign-in/email", { email, password: "a-long-unbreached-pass" })
    expect(refused.status).toBe(403)
    expect(((await refused.json()) as { code: string }).code).toBe("EMAIL_NOT_VERIFIED")
    const link = t.links.filter((l) => l.kind === "verify" && l.email === email).at(-1)!
    const opened = await t.call(link.url)
    expect(opened.status).toBeGreaterThanOrEqual(300)
    expect(opened.headers.getSetCookie().some((c) => c.startsWith(`${TOKEN}=`) && !/max-age=0/i.test(c))).toBe(true)
    expect((await post("/sign-in/email", { email, password: "a-long-unbreached-pass" })).status).toBe(200)
    const [u] = await t.db.select().from(user).where(eq(user.email, email))
    expect(t.verified.filter((id) => id === u!.id)).toHaveLength(1)
  })

  test("an unknown email and a wrong password get the same error", async () => {
    stubPwned()
    const email = t.email("known")
    await t.signIn(email)
    await t.db.insert(account).values({ id: crypto.randomUUID(), accountId: "x", providerId: "credential", userId: (await t.db.select().from(user).where(eq(user.email, email)))[0]!.id, password: "pbkdf2$1$00$00", updatedAt: new Date() })
    const wrong = await post("/sign-in/email", { email, password: "not-the-password-1" })
    const unknown = await post("/sign-in/email", { email: t.email("nobody"), password: "not-the-password-1" })
    expect(wrong.status).toBe(unknown.status)
    expect(((await wrong.json()) as { code: string }).code).toBe(((await unknown.json()) as { code: string }).code)
  })

  test("a code sign-in by the owner removes a password someone set before the address was verified", async () => {
    stubPwned()
    const email = t.email("owner")
    expect((await post("/sign-up/email", { email, password: "squatter-password-1", name: "x" })).status).toBe(200)
    await t.signIn(email)
    const [u] = await t.db.select().from(user).where(eq(user.email, email))
    expect(u!.emailVerified).toBe(true)
    expect(await t.db.select().from(account).where(eq(account.userId, u!.id))).toEqual([])
    expect((await post("/sign-in/email", { email, password: "squatter-password-1" })).status).toBe(401)
  })

  test("a password reset link works once, revokes every session, and the old password stops working", async () => {
    stubPwned()
    const email = t.email("reset")
    await post("/sign-up/email", { email, password: "old-password-123", name: "r" })
    await t.call(t.links.filter((l) => l.kind === "verify" && l.email === email).at(-1)!.url)
    const jar = (await post("/sign-in/email", { email, password: "old-password-123" })).headers.getSetCookie().map((c) => c.split(";")[0]).join("; ")
    expect((await post("/request-password-reset", { email, redirectTo: "/reset-password" })).status).toBe(200)
    const resetUrl = new URL(t.links.filter((l) => l.kind === "reset" && l.email === email).at(-1)!.url)
    const token = resetUrl.pathname.split("/").at(-1)!
    expect((await post("/reset-password", { token, newPassword: "new-password-456" })).status).toBe(200)
    expect((await post("/reset-password", { token, newPassword: "another-password-789" })).ok).toBe(false)
    expect((await post("/sign-in/email", { email, password: "old-password-123" })).status).toBe(401)
    expect((await post("/sign-in/email", { email, password: "new-password-456" })).status).toBe(200)
    expect(await (await t.call("/api/auth/get-session", { cookie: jar })).json()).toBeNull()
  })

  test("a reset request for an unknown email answers the same as for a known one and sends nothing", async () => {
    const before = t.links.length
    const res = await post("/request-password-reset", { email: t.email("ghost"), redirectTo: "/reset-password" })
    expect(res.status).toBe(200)
    expect(t.links.length).toBe(before)
  })

  test("a banned user cannot sign in with a code", async () => {
    const email = t.email("banned")
    await t.signIn(email)
    await t.db.update(user).set({ banned: true, banReason: "test" }).where(eq(user.email, email))
    await post("/email-otp/send-verification-otp", { email, type: "sign-in" })
    const res = await post("/sign-in/email-otp", { email, otp: t.codes.get(email) })
    expect(res.status).toBe(403)
    expect(((await res.json()) as { code: string }).code).toBe("BANNED_USER")
  })

  test("a temporary ban lifts itself at its end date", async () => {
    const email = t.email("tempban")
    await t.signIn(email)
    await t.db.update(user).set({ banned: true, banExpires: new Date(Date.now() - 1000) }).where(eq(user.email, email))
    expect(await t.signIn(email)).toContain(`${TOKEN}=`)
  })

  test("the platform role cannot be set through a profile update", async () => {
    const email = t.email("role")
    const jar = await t.signIn(email)
    await t.call("/api/auth/update-user", { method: "POST", body: { name: "x", role: "admin" }, cookie: jar })
    const [u] = await t.db.select({ role: user.role }).from(user).where(eq(user.email, email))
    expect(u!.role).toBe("user")
    expect(await t.db.select().from(session).where(eq(session.userId, (await t.db.select().from(user).where(eq(user.email, email)))[0]!.id))).not.toEqual([])
  })
})
