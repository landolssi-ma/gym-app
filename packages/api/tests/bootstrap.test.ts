import { describe, expect, test, vi } from "vitest"

import { announceUser, createApiHandler, parseApiEnv } from "../src/bootstrap"

// Every required ApiEnvSchema key, no optional integration keys (unconfigured-safe).
const valid = {
  APP_ORIGIN: "https://app.test",
  SMOKE_TOKEN: "test-smoke-token-0001",
  RATE_LIMIT_SALT: "test-rate-limit-salt-0001",
  HYPERDRIVE: { connectionString: "postgres://test" },
  S3_ENDPOINT: "https://s3.test",
  S3_ACCESS_KEY_ID: "test",
  S3_SECRET_ACCESS_KEY: "test",
  S3_BUCKET: "test",
  BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
  MAIL_API_URL: "https://mail.test",
  RESEND_API_KEY: "test",
  INNGEST_DEV: "0",
  INNGEST_EVENT_KEY: "test",
  INNGEST_SIGNING_KEY: "test",
  BILLING_API_KEY: "test",
  BILLING_WEBHOOK_SECRET: "whsec_dGVzdA==",
  BILLING_TEST_MODE: "1",
  CMS_PROVIDER: "basehub",
  CMS_API_KEY: "cms-read-token",
  CMS_API_URL: "https://cms.test/graphql",
  BILLING_PRODUCT_IDS: JSON.stringify({ "starter:month": "a", "starter:year": "b", "pro:month": "c", "pro:year": "d", "business:month": "e", "business:year": "f" }),
}
const local = { ...valid, APP_ORIGIN: "http://localhost:5173" }

function configError(env: object): string {
  try {
    parseApiEnv(env)
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
  throw new Error("expected parseApiEnv to throw")
}

describe("parseApiEnv", () => {
  test("a valid env parses, with every optional integration off", () => {
    const c = parseApiEnv(valid)
    expect(c.APP_ORIGIN).toBe("https://app.test")
    expect(c.google).toBeUndefined()
    expect(c.posthog).toBeUndefined()
    expect(c.ai).toBeUndefined()
  })

  test("a missing BETTER_AUTH_SECRET names the key, never a secret value", () => {
    const { BETTER_AUTH_SECRET: _omit, ...rest } = valid
    const message = configError({ ...rest, HYPERDRIVE: { connectionString: "postgres://secret-value" }, S3_SECRET_ACCESS_KEY: "s3-secret-value" })
    expect(message).toContain("BETTER_AUTH_SECRET: is missing")
    expect(message).not.toContain("secret-value")
  })

  test("a malformed APP_ORIGIN names the key and says it must be a URL, without echoing the value", () => {
    const message = configError({ ...valid, APP_ORIGIN: "not-a-url-value" })
    expect(message).toContain("APP_ORIGIN: must be a URL origin")
    expect(message).not.toContain("not-a-url-value")
  })

  test("an APP_ORIGIN with a path is refused: it must be a bare origin", () => {
    expect(configError({ ...valid, APP_ORIGIN: "https://app.test/app" })).toContain("APP_ORIGIN")
  })

  test("every bad key is named once", () => {
    const { SMOKE_TOKEN: _a, S3_BUCKET: _b, ...rest } = valid
    const message = configError(rest)
    expect(message).toContain("SMOKE_TOKEN: is missing")
    expect(message).toContain("S3_BUCKET: is missing")
    expect(message.match(/SMOKE_TOKEN/g)).toHaveLength(1)
  })

  test("Google is on only when both values are set", () => {
    expect(parseApiEnv({ ...valid, GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "s" }).google).toEqual({ clientId: "id", clientSecret: "s" })
  })

  test.each([
    ["only the client id", { GOOGLE_CLIENT_ID: "id" }],
    ["only the secret", { GOOGLE_CLIENT_SECRET: "s" }],
    ["blank values", { GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" }],
  ])("Google with %s is off, exactly as if neither were set", (_label, extra) => {
    const c = parseApiEnv({ ...valid, ...extra })
    expect(c.google).toBeUndefined()
    expect(c).toEqual(parseApiEnv(valid))
  })

  test("PostHog is on only when the key and a valid host are set", () => {
    expect(parseApiEnv({ ...valid, POSTHOG_KEY: "k", POSTHOG_HOST: "https://posthog.test" }).posthog).toEqual({ key: "k", host: "https://posthog.test" })
    expect(parseApiEnv({ ...valid, POSTHOG_KEY: "k", POSTHOG_HOST: "not a url" }).posthog).toBeUndefined()
    expect(parseApiEnv({ ...valid, POSTHOG_KEY: "k" }).posthog).toBeUndefined()
  })

  test("AI is on only when the key and a provider/model id are set", () => {
    expect(parseApiEnv({ ...valid, AI_GATEWAY_API_KEY: "k", AI_MODEL: "anthropic/claude-sonnet-5" }).ai).toEqual({ apiKey: "k", model: "anthropic/claude-sonnet-5" })
    for (const extra of [{ AI_GATEWAY_API_KEY: "k" }, { AI_MODEL: "anthropic/claude-sonnet-5" }, { AI_GATEWAY_API_KEY: "k", AI_MODEL: "claude-sonnet-5" }, { AI_GATEWAY_API_KEY: "", AI_MODEL: "" }])
      expect(parseApiEnv({ ...valid, ...extra })).toEqual(parseApiEnv(valid))
  })

  test("raw optional keys never reach the parsed config", () => {
    const c = parseApiEnv({ ...valid, GOOGLE_CLIENT_ID: "id", POSTHOG_KEY: "k", AI_GATEWAY_API_KEY: "k", AI_MODEL: "a/b" }) as Record<string, unknown>
    expect(Object.keys(c).filter((k) => k.startsWith("GOOGLE_") || k.startsWith("POSTHOG_") || k.startsWith("AI_"))).toEqual([])
  })

  test("RESEND_API_KEY may be empty only on a local http origin", () => {
    expect(parseApiEnv({ ...local, RESEND_API_KEY: "" }).RESEND_API_KEY).toBe("")
    expect(parseApiEnv({ ...local, RESEND_API_KEY: undefined }).RESEND_API_KEY).toBe("")
    expect(configError({ ...valid, RESEND_API_KEY: "" })).toContain("RESEND_API_KEY: is required unless APP_ORIGIN is a local http origin")
  })

  test("INNGEST_DEV=1 is refused on an https origin", () => {
    expect(parseApiEnv({ ...local, INNGEST_DEV: "1" }).INNGEST_DEV).toBe("1")
    expect(configError({ ...valid, INNGEST_DEV: "1" })).toContain("INNGEST_DEV")
  })
})

describe("createApiHandler", () => {
  const site = {
    name: "Acme",
    logoPath: "/logo.png",
    supportEmail: "support@app.test",
    mailFrom: "Acme <hello@app.test>",
    cookiePrefix: "__Host-acme",
    emailTheme: { background: "#fff", text: "#000", button: "#ff0", buttonText: "#000", buttonBorder: "0", font: "system-ui" },
  }
  const opts = () => ({ waitUntil: vi.fn(), site })

  test("GET /api/nope answers 404 not_found", async () => {
    const res = await createApiHandler({ ...valid }, opts())(new Request("https://app.test/api/nope"))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "not_found" })
  })

  test("invalid config throws naming the key, never a secret value", () => {
    const { BETTER_AUTH_SECRET: _omit, ...rest } = valid
    expect(() => createApiHandler({ ...rest, HYPERDRIVE: { connectionString: "postgres://secret-value" } }, opts())).toThrow(/BETTER_AUTH_SECRET: is missing$/)
  })

  test("two requests close their per-request deps through waitUntil twice", async () => {
    const o = opts()
    const handle = createApiHandler({ ...valid }, o)
    await handle(new Request("https://app.test/api/nope"))
    await handle(new Request("https://app.test/api/nope"))
    expect(o.waitUntil).toHaveBeenCalledTimes(2)
  })

  test("the same env object returns the same handler", () => {
    const env = { ...valid }
    const o = opts()
    expect(createApiHandler(env, o)).toBe(createApiHandler(env, o))
  })
})

describe("announceUser", () => {
  const u = { id: "u1", email: "a@app.test" }
  test("emits user.created once (deduped by user id) and sends the welcome email", async () => {
    const send = vi.fn(async () => {})
    const mail = { send: vi.fn(async () => {}) }
    await announceUser({ jobs: { send } as never, mail, log: { info() {}, warn() {}, error: vi.fn() }, appOrigin: "https://app.test" }, u)
    expect(send).toHaveBeenCalledWith("user.created", { userId: "u1", email: "a@app.test" }, "user.created:u1")
    expect(mail.send).toHaveBeenCalledWith("welcome", "a@app.test", { appUrl: "https://app.test/dashboard" })
  })

  test("a failed email is logged and does not throw", async () => {
    const error = vi.fn()
    const mail = { send: vi.fn(async () => { throw new Error("provider down") }) }
    await expect(announceUser({ jobs: { send: async () => {} } as never, mail, log: { info() {}, warn() {}, error }, appOrigin: "https://app.test" }, u)).resolves.toBeUndefined()
    expect(error).toHaveBeenCalledWith("user_created_followup", expect.anything())
  })
})

describe("billing config", () => {
  test("BILLING_PRODUCT_IDS must name every plan and interval", () => {
    expect(parseApiEnv(valid).BILLING_PRODUCT_IDS["pro:year"]).toBe("d")
    expect(configError({ ...valid, BILLING_PRODUCT_IDS: JSON.stringify({ "pro:year": "d" }) })).toContain("BILLING_PRODUCT_IDS")
    expect(configError({ ...valid, BILLING_PRODUCT_IDS: "not json" })).toContain("BILLING_PRODUCT_IDS: must be JSON written by pnpm billing:setup")
  })
})
