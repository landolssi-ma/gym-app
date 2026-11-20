// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, Suspense } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn(), replace: vi.fn() }))
vi.mock("@/lib/api-fetch", async (orig) => ({ ...(await orig<object>()), apiFetch: mocks.apiFetch }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }), usePathname: () => "/team" }))
vi.mock("@workspace/auth/client", () => ({ signOut: vi.fn() }))

import TeamView from "../../../app/(app)/(shell)/team/page"
import { AcceptInviteView } from "../../../app/team/accept/[token]/accept-invite-view"
import { ApiError } from "@/lib/api-fetch"
import { getActiveOrgId } from "@/lib/active-org"

import { mount, waitFor } from "../../helpers/dom"
import { meBody } from "../../helpers/me"

const member = (id: string, role: string, name: string, userId = id) => ({ id, userId, role, name, email: `${name.toLowerCase()}@example.com`, image: null, createdAt: "2026-11-01T00:00:00Z" })
const team = (role: string) => ({
  role,
  seats: { used: 4, limit: 5 },
  members: [member("m1", "owner", "Ada", "u1"), member("m2", "admin", "Grace"), member("m3", "member", "Alan")],
  invitations: [{ id: "i1", email: "new@example.com", role: "member", expiresAt: "2026-11-10T00:00:00Z" }],
})

let m: ReturnType<typeof mount>
beforeEach(() => {
  m = mount()
  mocks.apiFetch.mockReset()
  mocks.replace.mockReset()
})
afterEach(() => m.unmount())

async function renderTeam(role: "owner" | "admin" | "member", me = meBody({ orgRole: role, user: { id: role === "owner" ? "u1" : "m3", name: "Viewer", email: "v@example.com", image: null } })) {
  mocks.apiFetch.mockImplementation(async (url: string) => Response.json(String(url).endsWith("/api/team") ? team(role) : me))
  await m.render(
    <QueryClientProvider client={new QueryClient()}>
      <Suspense fallback="loading">{TeamView()}</Suspense>
    </QueryClientProvider>,
  )
  await waitFor(() => m.container.textContent?.includes("Pending invitations") ?? false)
}
const buttons = () => [...m.container.querySelectorAll("button")].map((b) => b.textContent)

describe("team page", () => {
  it("owner: seats used of the limit, invite with a role, revoke, change role, remove and transfer; no leave", async () => {
    await renderTeam("owner")
    const text = m.container.textContent ?? ""
    expect(text).toContain("4 of 5 seats used")
    expect(text).toContain("new@example.com")
    expect(m.container.querySelector("#invite-email")).not.toBeNull()
    expect(m.container.querySelector("#invite-role")).not.toBeNull()
    expect(buttons()).toEqual(expect.arrayContaining(["Revoke", "Make owner", "Remove"]))
    expect(buttons()).not.toContain("Leave workspace")
    expect(m.container.querySelector('select[aria-label="Role for Grace"]')).not.toBeNull()
    // Nobody edits the owner's role.
    expect(m.container.querySelector('select[aria-label="Role for Ada"]')).toBeNull()
  })

  it("admin: manages members and invitations, but cannot transfer ownership", async () => {
    await renderTeam("admin", meBody({ orgRole: "admin", user: { id: "m2", name: "Grace", email: "grace@example.com", image: null } }))
    expect(buttons()).toEqual(expect.arrayContaining(["Revoke", "Remove", "Leave workspace"]))
    expect(buttons()).not.toContain("Make owner")
    expect(m.container.querySelector("#invite-email")).not.toBeNull()
  })

  it("member: sees the list and a leave action, and no management controls", async () => {
    await renderTeam("member")
    expect(m.container.textContent).toContain("Grace")
    expect(buttons()).toEqual(expect.arrayContaining(["Leave workspace"]))
    for (const b of ["Revoke", "Remove", "Make owner"]) expect(buttons()).not.toContain(b)
    expect(m.container.querySelector("#invite-email")).toBeNull()
    expect(m.container.querySelector("select")).toBeNull()
  })
})

describe("invite accept page", () => {
  const renderAccept = () => m.render(<QueryClientProvider client={new QueryClient()}><AcceptInviteView token="inv_1" /></QueryClientProvider>)

  it("accepting makes the workspace active and lands on its dashboard", async () => {
    mocks.apiFetch.mockResolvedValue(Response.json({ organizationId: "org_9" }))
    await renderAccept()
    await waitFor(() => mocks.replace.mock.calls.length > 0)
    expect(mocks.replace).toHaveBeenCalledWith("/dashboard")
    expect(getActiveOrgId()).toBe("org_9")
  })

  it("signed in with another email: explains and offers to sign out", async () => {
    mocks.apiFetch.mockResolvedValue(Response.json({ error: "wrong_email" }, { status: 403 }))
    await renderAccept()
    await waitFor(() => m.container.textContent?.includes("Sent to a different address") ?? false)
  })

  it("an expired or revoked invitation says it is no longer valid", async () => {
    mocks.apiFetch.mockResolvedValue(Response.json({ error: "not_found" }, { status: 404 }))
    await renderAccept()
    await waitFor(() => m.container.textContent?.includes("This invitation isn't valid") ?? false)
  })

  it("a full workspace says so", async () => {
    mocks.apiFetch.mockRejectedValue(new ApiError(402, "upgrade_required"))
    await act(renderAccept)
    await waitFor(() => m.container.textContent?.includes("no free seats") ?? false)
  })
})
