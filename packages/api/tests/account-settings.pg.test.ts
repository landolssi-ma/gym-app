import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { eq, user } from "@workspace/db"
import { TEST_PG_URL } from "@workspace/db/testing"

import { createPgApp, TOKEN } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("password, email and ban rules against real Postgres", () => {
  const t = TEST_PG_URL ? createPgApp() : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  const realFetch = globalThis.fetch
  // Have I Been Pwned: nothing is breached.
  beforeEach(() => vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => (String(input).includes("pwnedpasswords") ? Promise.resolve(new Response("")) : realFetch(input, init))))
  afterEach(() => vi.unstubAllGlobals())
  const post = (path: string, body: unknown, cookie?: string) => t.call(`/api/auth${path}`, { method: "POST", body, cookie })

  async function passwordUser(password = "first-password-123") {
    const email = t.email("pwuser")
    await post("/sign-up/email", { email, password, name: "p" })
    await t.call(t.links.filter((l) => l.kind === "verify" && l.email === email).at(-1)!.url)
    const jar = t.jarFrom(await post("/sign-in/email", { email, password }))
    return { email, jar }
  }

  test("changing the password needs the current one", async () => {
    const { email, jar } = await passwordUser()
    expect((await post("/change-password", { currentPassword: "wrong-password-0", newPassword: "second-password-456" }, jar)).ok).toBe(false)
    expect((await post("/sign-in/email", { email, password: "first-password-123" })).status).toBe(200)
    expect((await post("/change-password", { currentPassword: "first-password-123", newPassword: "second-password-456" }, jar)).status).toBe(200)
    expect((await post("/sign-in/email", { email, password: "second-password-456" })).status).toBe(200)
  })

  test("a new email takes effect only after the link sent to it is opened", async () => {
    const { email, jar } = await passwordUser()
    const newEmail = t.email("moved")
    expect((await post("/change-email", { newEmail, callbackURL: "/settings/profile" }, jar)).status).toBe(200)
    const [before] = await t.db.select({ email: user.email }).from(user).where(eq(user.email, email))
    expect(before?.email).toBe(email)
    const link = t.links.filter((l) => l.kind === "verify" && l.email === newEmail).at(-1)
    expect(link).toBeDefined()
    await t.call(link!.url, { cookie: jar })
    expect(await t.db.select().from(user).where(eq(user.email, email))).toEqual([])
    expect(await t.db.select().from(user).where(eq(user.email, newEmail))).toHaveLength(1)
  })

  test("a banned user cannot sign in with a password either", async () => {
    const { email } = await passwordUser()
    await t.db.update(user).set({ banned: true, banReason: "test" }).where(eq(user.email, email))
    const res = await post("/sign-in/email", { email, password: "first-password-123" })
    expect(res.status).toBe(403)
    expect(((await res.json()) as { code: string }).code).toBe("BANNED_USER")
    expect(res.headers.getSetCookie().some((c) => c.startsWith(`${TOKEN}=`) && !/max-age=0/i.test(c))).toBe(false)
  })
})
