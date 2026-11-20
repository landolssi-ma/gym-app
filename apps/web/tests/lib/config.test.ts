import { afterEach, describe, expect, it, vi } from "vitest"

const env: Record<string, unknown> = {}
vi.mock("cloudflare:workers", () => ({ env }))

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

async function load(extra: Record<string, string>) {
  for (const k of Object.keys(env)) delete env[k]
  Object.assign(env, valid, extra)
  vi.resetModules()
  return (await import("../../lib/config")).getConfig
}
const loadPublic = async (extra: Record<string, string>) => (await load(extra), (await import("../../lib/config")).getPublicConfig())

afterEach(() => vi.resetModules())

describe("getConfig", () => {
  it("turns Google off instead of throwing on blank values", async () => {
    const c = (await load({ GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" }))()
    expect(c.google).toBeUndefined()
    expect(c.APP_ORIGIN).toBe("https://app.test")
  })

  it("keeps a complete Google config", async () => {
    const c = (await load({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "s" }))()
    expect(c.google).toEqual({ clientId: "id", clientSecret: "s" })
  })

  it("rejects an invalid required value, naming it", async () => {
    const getConfig = await load({ APP_ORIGIN: "not an origin" })
    expect(getConfig).toThrow("APP_ORIGIN")
  })

  it("parses once and reuses the result for the same env", async () => {
    const getConfig = await load({})
    expect(getConfig()).toBe(getConfig())
  })
})

describe("getPublicConfig", () => {
  it("says whether AI is on, and holds neither its key nor its model", async () => {
    expect((await loadPublic({})).aiEnabled).toBe(false)
    const on = await loadPublic({ AI_GATEWAY_API_KEY: "ai-key-secret", AI_MODEL: "anthropic/claude-sonnet-5" })
    expect(on.aiEnabled).toBe(true)
    expect(JSON.stringify(on)).not.toMatch(/ai-key-secret|claude-sonnet-5/)
  })
})
