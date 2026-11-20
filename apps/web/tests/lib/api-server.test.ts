import { describe, expect, it, vi } from "vitest"

// api-server.ts imports Worker-only modules (cloudflare:workers, next/headers, the API bootstrap);
// all are mocked so this file can exercise the pure `buildInProcessRequest` export under Node.
vi.mock("cloudflare:workers", () => ({ env: {}, waitUntil: (p: Promise<unknown>) => p }))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("../../lib/config", () => ({ getConfig: () => ({ APP_ORIGIN: "https://app.test" }) }))
vi.mock("@workspace/api/bootstrap", () => ({ createApiHandler: () => async () => new Response(null) }))

const { buildInProcessRequest } = await import("../../lib/api-server")

describe("buildInProcessRequest", () => {
  it("forwards the given cookie header", () => {
    const req = buildInProcessRequest("https://app.test", "/api/me", "session_token=abc")
    expect(req.headers.get("cookie")).toBe("session_token=abc")
  })

  it("sets no cookie header at all when cookie is null (not an empty string)", () => {
    const req = buildInProcessRequest("https://app.test", "/api/me", null)
    expect(req.headers.has("cookie")).toBe(false)
  })

  it("resolves the path against the given origin", () => {
    const req = buildInProcessRequest("https://app.test", "/api/me", null)
    expect(req.url).toBe("https://app.test/api/me")
  })
})
