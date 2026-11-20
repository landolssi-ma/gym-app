// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Suspense } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn(), callApiInProcess: vi.fn(), startImpersonation: vi.fn(), pathname: "/admin" }))
vi.mock("@/lib/api-fetch", async (orig) => ({ ...(await orig<object>()), apiFetch: mocks.apiFetch }))
vi.mock("@/lib/api-server", () => ({ callApiInProcess: mocks.callApiInProcess }))
vi.mock("@workspace/auth/client", () => ({ startImpersonation: mocks.startImpersonation }))
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, notFound: () => { throw new Error("NEXT_NOT_FOUND") } }))

import { t } from "@workspace/i18n"

import BackofficeLayout from "../../../app/(backoffice)/admin/layout"
import { AuditLog, OrganizationDetail, SubscriptionsList, UserDetail, UsersList } from "@/features/backoffice"

import { byText, click, mount, type, waitFor } from "../../helpers/dom"
import { renderServer } from "../../helpers/render-server"

const user = (over = {}) => ({
  id: "u1", name: "Ada", email: "ada@example.com", image: null, role: "user", banned: false, banReason: null, banExpires: null, createdAt: "2026-01-02T00:00:00Z",
  organizations: [{ id: "o1", name: "Acme", role: "owner", deletedAt: null }],
  sessions: [{ id: "s1", createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-08T00:00:00Z", ipAddress: "203.0.113.1", userAgent: "Firefox", impersonatedBy: null }],
  ...over,
})
const org = { id: "o1", name: "Acme", logo: null, suspended: false, deletedAt: null, createdAt: "2026-01-02T00:00:00Z", members: [{ userId: "u1", role: "owner", name: "Ada", email: "ada@example.com" }], subscription: { plan: "pro", interval: "month", status: "past_due", trialEndsAt: null, currentPeriodEnd: "2026-12-01T00:00:00Z", cancelAtPeriodEnd: false } }

let m: ReturnType<typeof mount>
let routes: Record<string, unknown>
beforeEach(() => {
  m = mount()
  vi.clearAllMocks()
  routes = {}
  mocks.apiFetch.mockImplementation(async (url: string) => {
    const path = new URL(String(url), "http://x").pathname
    return Response.json(routes[path] ?? { ok: true })
  })
})
afterEach(() => m.unmount())

const requests = () => mocks.apiFetch.mock.calls.map(([url, init]) => ({ method: (init as RequestInit | undefined)?.method ?? "GET", url: new URL(String(url), "http://x"), body: (init as RequestInit | undefined)?.body ? JSON.parse(String((init as RequestInit).body)) : undefined }))
const render = async (node: React.ReactNode, ready: () => boolean) => {
  await m.render(
    <QueryClientProvider client={new QueryClient()}>
      <Suspense fallback="loading">{node}</Suspense>
    </QueryClientProvider>,
  )
  await waitFor(ready)
}
const text = () => m.container.textContent ?? ""

describe("backoffice layout", () => {
  it("is the 404 page for anyone the API does not answer 204 for", async () => {
    for (const status of [401, 403]) {
      mocks.callApiInProcess.mockResolvedValueOnce(new Response(null, { status }))
      await expect(BackofficeLayout({ children: "secret" })).rejects.toThrow("NEXT_NOT_FOUND")
    }
    expect(mocks.callApiInProcess).toHaveBeenCalledWith("/api/admin/check")
  })

  it("renders the backoffice nav and the page for a platform admin", async () => {
    mocks.callApiInProcess.mockResolvedValueOnce(new Response(null, { status: 204 }))
    const html = await renderServer(await BackofficeLayout({ children: <p>users page</p> }))
    expect(html).toContain("users page")
    for (const href of ["/admin", "/admin/organizations", "/admin/subscriptions", "/admin/audit", "/dashboard"]) expect(html).toContain(`href="${href}"`)
  })
})

describe("users", () => {
  it("lists users with a link to each, falling back to the email for a nameless user", async () => {
    routes["/api/admin/users"] = { users: [user(), user({ id: "u2", name: "", email: "noname@example.com", banned: true })], nextCursor: null }
    await render(<UsersList />, () => text().includes("noname@example.com"))
    expect(m.container.querySelector('a[href="/admin/users/u2"]')?.textContent).toBe("noname@example.com")
    expect(text()).toContain(t("backoffice.banned"))
  })

  it("bans with a reason and an optional end date, and revokes one session", async () => {
    routes["/api/admin/users/u1"] = user()
    await render(<UserDetail userId="u1" />, () => text().includes("Firefox"))
    await click(byText(t("backoffice.ban")))
    await type(document.querySelector("#backoffice-reason"), "spam")
    await type(document.querySelector("#backoffice-end"), "2099-01-31")
    await click([...document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')].find((b) => b.textContent === t("backoffice.ban")))
    await waitFor(() => requests().some((r) => r.method === "POST"))
    const ban = requests().find((r) => r.url.pathname === "/api/admin/users/u1/ban")!
    expect(ban.body.reason).toBe("spam")
    expect(new Date(ban.body.expiresAt).getFullYear()).toBe(2099)
    await click(byText(t("backoffice.revoke")))
    await waitFor(() => requests().some((r) => r.url.pathname === "/api/admin/users/u1/sessions/s1/revoke"))
  })

  it("offers no ban, impersonation or revoke for a platform admin", async () => {
    routes["/api/admin/users/u1"] = user({ role: "admin" })
    await render(<UserDetail userId="u1" />, () => text().includes("Firefox"))
    for (const label of ["ban", "impersonate", "revoke"] as const) expect(byText(t(`backoffice.${label}`))).toBeUndefined()
  })

  it("impersonation opens the app as the user", async () => {
    routes["/api/admin/users/u1"] = user()
    mocks.startImpersonation.mockResolvedValue({ ok: true })
    const assign = vi.fn()
    vi.stubGlobal("location", { ...window.location, assign })
    await render(<UserDetail userId="u1" />, () => text().includes("Firefox"))
    await click(byText(t("backoffice.impersonate")))
    expect(mocks.startImpersonation).toHaveBeenCalledWith("u1")
    expect(assign).toHaveBeenCalledWith("/dashboard")
    vi.unstubAllGlobals()
  })
})

describe("workspaces", () => {
  it("shows members and subscription, and suspends with a reason", async () => {
    routes["/api/admin/organizations/o1"] = org
    await render(<OrganizationDetail orgId="o1" />, () => text().includes("ada@example.com"))
    expect(text()).toContain("past_due")
    expect(m.container.querySelector('a[href="/admin/audit?organizationId=o1"]')).not.toBeNull()
    await click(byText(t("backoffice.suspend")))
    await type(document.querySelector("#backoffice-reason"), "chargeback")
    await click([...document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')].find((b) => b.textContent === t("backoffice.suspend")))
    await waitFor(() => requests().some((r) => r.url.pathname === "/api/admin/organizations/o1/suspend"))
    expect(requests().find((r) => r.url.pathname.endsWith("/suspend"))!.body).toEqual({ reason: "chargeback" })
  })
})

describe("subscriptions", () => {
  it("filters by status and links each row to its workspace", async () => {
    routes["/api/admin/subscriptions"] = { subscriptions: [{ organizationId: "o1", organizationName: "Acme", plan: "pro", interval: "month", status: "past_due", currentPeriodEnd: "2026-12-01T00:00:00Z", cancelAtPeriodEnd: false }], nextCursor: null }
    await render(<SubscriptionsList />, () => text().includes("Acme"))
    expect(m.container.querySelector('a[href="/admin/organizations/o1"]')).not.toBeNull()
    // The first select is the status filter.
    const status = m.container.querySelector("select")!
    expect(status.getAttribute("aria-label")).toBe(t("backoffice.colStatus"))
    status.value = "past_due"
    status.dispatchEvent(new Event("change", { bubbles: true }))
    await waitFor(() => requests().some((r) => r.url.searchParams.get("status") === "past_due"))
  })
})

describe("audit log", () => {
  it("shows entries with the impersonator, and filters by workspace from the URL and the form", async () => {
    routes["/api/admin/audit"] = { entries: [{ id: "a1", createdAt: "2026-11-08T10:00:00Z", action: "workspace.created", organizationId: "o1", actorId: "u1", actorEmail: "ada@example.com", impersonatorId: "admin1", targetType: "workspace", targetId: "o1", metadata: { name: "Acme" }, ip: null }], nextCursor: null }
    await render(<AuditLog initial={{ organizationId: "o1" }} />, () => text().includes("workspace.created"))
    expect(requests()[0]!.url.searchParams.get("organizationId")).toBe("o1")
    expect(text()).toContain(t("backoffice.viaImpersonation"))
    await type(document.querySelector("#audit-action"), "user.banned")
    await click(byText(t("backoffice.filter")))
    await waitFor(() => requests().some((r) => r.url.searchParams.get("action") === "user.banned" && r.url.searchParams.get("organizationId") === "o1"))
  })
})
