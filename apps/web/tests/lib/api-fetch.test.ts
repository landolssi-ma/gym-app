import { beforeEach, describe, expect, it, vi } from "vitest"

import { onLocalOrgChange } from "../../lib/broadcast"
import { setActiveOrgId } from "../../lib/active-org"

// vitest's default environment for apps/web tests is "node" per vitest.config.ts -- stub a
// minimal window for this file only, since apiFetch reads window.location on 401.
const assign = vi.fn()
const dispatchEvent = vi.fn()
;(globalThis as unknown as { window: Window }).window = { location: { pathname: "/projects", assign }, dispatchEvent } as unknown as Window

const { apiFetch, ApiError } = await import("../../lib/api-fetch")

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status })
}

beforeEach(() => {
  assign.mockClear()
  setActiveOrgId(null as unknown as string)
})

describe("apiFetch", () => {
  it("sends no x-org-id header while the active-org store is unseeded", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).has("x-org-id")).toBe(false)
      return jsonResponse(200, { ok: true })
    })
    vi.stubGlobal("fetch", fetchMock)
    await apiFetch("/api/projects")
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it("sends x-org-id after setActiveOrgId", async () => {
    setActiveOrgId("org_1")
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("x-org-id")).toBe("org_1")
      return jsonResponse(200, { ok: true })
    })
    vi.stubGlobal("fetch", fetchMock)
    await apiFetch("/api/projects")
  })

  it("redirects to sign-in and rejects with ApiError(401) on a 401 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(401, { error: "unauthorized" })),
    )
    await expect(apiFetch("/api/projects")).rejects.toMatchObject({ status: 401 } as Partial<InstanceType<typeof ApiError>>)
    expect(assign).toHaveBeenCalledWith("/sign-in?next=%2Fprojects")
  })

  it("notifies the local org-change signal exactly once and rejects with ApiError(409) on a 409 org_changed response, without calling fetch twice", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(409, { error: "org_changed" }))
    vi.stubGlobal("fetch", fetchMock)
    const listener = vi.fn()
    onLocalOrgChange(listener)
    await expect(apiFetch("/api/projects")).rejects.toMatchObject({ status: 409 })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it("returns a 409 response unmodified when the body is not org_changed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(409, { error: "rate_limited" })),
    )
    const res = await apiFetch("/api/projects")
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: "rate_limited" })
  })

  it("opens the upgrade dialog and rejects with ApiError(402) on upgrade_required", async () => {
    dispatchEvent.mockClear()
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(402, { error: "upgrade_required", reason: "projects", used: 3, limit: 3 })))
    await expect(apiFetch("/api/projects")).rejects.toMatchObject({ status: 402, body: { reason: "projects", used: 3, limit: 3 } })
    const event = dispatchEvent.mock.calls[0]![0] as CustomEvent
    expect(event.type).toBe("upgrade-required")
    expect(event.detail).toEqual({ reason: "projects", used: 3, limit: 3 })
  })

  it("passes through other statuses unmodified", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(404, { error: "not_found" })))
    const res = await apiFetch("/api/projects")
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "not_found" })
  })
})
