import { createCookieGetter, getCookies } from "better-auth/cookies"
import { describe, expect, test, vi } from "vitest"

import type { Db } from "@workspace/db"

import { createBetterAuth, type AuthConfig } from "../src/better-auth"
import { createAuth } from "../src/index"

const baseConfig: Omit<AuthConfig, "db"> = {
  secret: "x".repeat(32),
  appOrigin: "https://app.test",
  cookiePrefix: "__Host-acme",
  waitUntil: (p: Promise<unknown>) => void p,
  google: { clientId: "id", clientSecret: "secret" },
  sendSignInCode: async () => {},
  sendVerificationEmail: async () => {},
  sendPasswordReset: async () => {},
  onUserVerified: async () => {},
}
// Never queried: these tests read only the options.
const cfg: AuthConfig = { db: {} as Db, ...baseConfig }
const options = () => createBetterAuth(cfg).options
const plugin = <T>(id: string) => options().plugins?.find((p) => p.id === id) as { options: T } | undefined

// Browsers only accept __Host- cookies that are Secure, Path=/ and carry no Domain.
test("every auth cookie uses the configured prefix and is Secure, HttpOnly, SameSite=Lax, Path=/, no Domain", () => {
  const cookies = getCookies(options())
  expect(cookies.sessionToken.name).toBe("__Host-acme.session_token")
  const state = ["state", "oauth_state"].map((n) => createCookieGetter(options())(n))
  for (const { name, attributes } of [...Object.values(cookies), ...state]) {
    expect(name).toMatch(/^__Host-acme\./)
    expect(attributes.secure).toBe(true)
    expect(attributes.path).toBe("/")
    expect(attributes.domain).toBeUndefined()
  }
  expect(cookies.sessionToken.attributes).toMatchObject({ httpOnly: true, sameSite: "lax" })
})

test("user.role is server-owned: input disabled, defaults to 'user'", () => {
  const role = options().user?.additionalFields?.role
  expect(role?.input).toBe(false)
  expect(role?.defaultValue).toBe("user")
})

test("sessions are read fresh: the cookie cache is off", () => {
  expect(options().session?.cookieCache?.enabled).toBe(false)
})

test("password sign-up requires a verified email and does not sign in", () => {
  const o = options()
  expect(o.emailAndPassword).toMatchObject({ enabled: true, minPasswordLength: 8, requireEmailVerification: true, autoSignIn: false })
  expect(o.emailVerification).toMatchObject({ sendOnSignUp: true, autoSignInAfterVerification: true })
})

test("a password reset link lasts 1 hour and revokes every session", () => {
  expect(options().emailAndPassword).toMatchObject({ resetPasswordTokenExpiresIn: 3600, revokeSessionsOnPasswordReset: true })
})

test("email change is on: the new address must be verified first", () => {
  expect(options().user?.changeEmail).toEqual({ enabled: true })
})

test("sign-in codes are 8 digits, expire in 10 minutes and allow 5 attempts", () => {
  expect(plugin<Record<string, unknown>>("email-otp")?.options).toMatchObject({ otpLength: 8, expiresIn: 600, allowedAttempts: 5 })
})

test("breached passwords are refused", () => {
  expect(plugin("have-i-been-pwned")).toBeDefined()
})

test("Google is offered only when configured", () => {
  expect(options().socialProviders).toHaveProperty("google")
  expect(createBetterAuth({ ...cfg, google: undefined }).options.socialProviders).toEqual({})
})

test("impersonation lasts at most 1 hour", () => {
  expect(plugin<Record<string, unknown>>("admin")?.options).toMatchObject({ impersonationSessionDuration: 3600 })
})

test("auth endpoints that send email or check a secret have tighter rate limits", () => {
  const rules: Record<string, unknown> = options().rateLimit?.customRules ?? {}
  expect(options().rateLimit).toMatchObject({ enabled: true, storage: "database" })
  for (const path of ["/sign-in/*", "/sign-up/*", "/email-otp/*", "/send-verification-email", "/request-password-reset"]) expect(rules[path], path).toBeTruthy()
})

test("the client IP comes from cf-connecting-ip only", () => {
  expect(options().advanced?.ipAddress?.ipAddressHeaders).toEqual(["cf-connecting-ip"])
})

test("$context resolves with no schema mismatch and server-owned fields stay input:false", async () => {
  const { tables } = await createBetterAuth(cfg).$context
  expect(tables.user?.fields.role?.input).toBe(false)
  expect(tables.user?.fields.banned?.input).toBe(false)
})

describe("createAuth", () => {
  test("exposes exactly the facade surface: no Better Auth instance, api or options escape", () => {
    expect(Object.keys(createAuth(cfg)).sort()).toEqual(
      [
        "banUser",
        "getSession",
        "handleRequest",
        "hasRole",
        "isImpersonating",
        "listUserSessions",
        "revokeAllSessions",
        "revokeImpersonationSessions",
        "revokeSession",
        "unbanUser",
      ].sort(),
    )
  })

  // get-session is never rate limited, so a request without a cookie makes no database call at all.
  test("handleRequest: get-session without a cookie answers 200 null and touches no database", async () => {
    const noDb = new Proxy({}, { get: () => { throw new Error("unexpected db access") } }) as Db
    const res = await createAuth({ ...baseConfig, db: noDb }).handleRequest(new Request("https://app.test/api/auth/get-session", { headers: { origin: "https://app.test" } }))
    expect(res.status).toBe(200)
    expect(await res.json()).toBeNull()
  })
})
