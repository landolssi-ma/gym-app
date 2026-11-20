// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, Suspense } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  updateName: vi.fn(async () => ({ ok: true })),
  changeEmail: vi.fn(async () => ({ ok: true })),
  changePassword: vi.fn(async () => ({ ok: true })),
  requestPasswordReset: vi.fn(async () => ({ ok: true })),
}))
vi.mock("@/lib/api-fetch", async (orig) => ({ ...(await orig<object>()), apiFetch: mocks.apiFetch }))
vi.mock("@workspace/auth/client", () => ({ updateName: mocks.updateName, changeEmail: mocks.changeEmail, changePassword: mocks.changePassword, requestPasswordReset: mocks.requestPasswordReset, signOut: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }), usePathname: () => "/settings" }))

import { ProfileView } from "../../../app/(app)/(shell)/settings/profile/profile-view"
import { SecurityView } from "../../../app/(app)/(shell)/settings/security/security-view"
import { WorkspaceView } from "../../../app/(app)/(shell)/settings/workspace/workspace-view"
import type { Me } from "@/features/auth"

import { click, mount, type, waitFor } from "../../helpers/dom"
import { meBody } from "../../helpers/me"

let m: ReturnType<typeof mount>
let me: Me
beforeEach(() => {
  m = mount()
  me = meBody()
  vi.clearAllMocks()
  mocks.apiFetch.mockImplementation(async (url: string, init?: RequestInit) => {
    const u = String(url)
    if (u.endsWith("/api/account/sessions"))
      return Response.json({
        sessions: [
          { id: "s1", userAgent: "Firefox", country: "FR", createdAt: "2026-11-01T00:00:00Z", lastActiveAt: "2026-11-08T10:00:00Z", current: true },
          { id: "s2", userAgent: "Safari", country: null, createdAt: "2026-11-01T00:00:00Z", lastActiveAt: "2026-11-07T10:00:00Z", current: false },
        ],
      })
    if (u.endsWith("/api/organizations/current") && init?.method === "PATCH") return Response.json({ ok: true })
    if (u.includes("/api/account/sessions/")) return Response.json({ ok: true })
    return Response.json(me)
  })
})
afterEach(() => m.unmount())

async function render(node: React.ReactNode, ready: string) {
  await m.render(
    <QueryClientProvider client={new QueryClient()}>
      <Suspense fallback="loading">{node}</Suspense>
    </QueryClientProvider>,
  )
  await waitFor(() => m.container.textContent?.includes(ready) ?? false)
}
const submit = (form: Element | null) => act(async () => (form as HTMLFormElement).requestSubmit())
const btn = (label: string) => [...m.container.querySelectorAll("button")].find((b) => b.textContent?.trim() === label)

describe("profile", () => {
  it("saving a name updates it and refreshes the shell's /api/me", async () => {
    await render(<ProfileView />, "Profile")
    await type(m.container.querySelector("#profile-name"), "Ada King")
    const before = mocks.apiFetch.mock.calls.length
    await submit(m.container.querySelector("#profile-name")!.closest("form"))
    expect(mocks.updateName).toHaveBeenCalledWith("Ada King")
    await waitFor(() => mocks.apiFetch.mock.calls.length > before)
  })

  it("an email change sends a link to the new address and keeps the current email", async () => {
    await render(<ProfileView />, "Signed in as ada@example.com")
    await type(m.container.querySelector("#profile-email"), "ada@new.example")
    await submit(m.container.querySelector("#profile-email")!.closest("form"))
    expect(mocks.changeEmail).toHaveBeenCalledWith("ada@new.example", "/settings/profile")
    await waitFor(() => m.container.textContent?.includes("We sent a confirmation link to ada@new.example") ?? false)
    expect(m.container.textContent).toContain("Signed in as ada@example.com")
  })
})

describe("security", () => {
  it("lists sessions with the current one marked, and revokes another", async () => {
    await render(<SecurityView />, "Firefox · FR")
    expect(m.container.textContent).toContain("This device")
    expect(m.container.textContent).toContain("Safari")
    await click(btn("Sign out"))
    await waitFor(() => mocks.apiFetch.mock.calls.some(([u, i]) => String(u).endsWith("/api/account/sessions/s2") && i?.method === "DELETE"))
  })

  it("changing the password sends the current and new ones", async () => {
    me = meBody({ hasPassword: true } as Partial<Me>)
    await render(<SecurityView />, "Change password")
    await type(m.container.querySelector("#current-password"), "old-password-1")
    await type(m.container.querySelector("#new-password"), "new-password-22")
    await submit(m.container.querySelector("#new-password")!.closest("form"))
    expect(mocks.changePassword).toHaveBeenCalledWith("old-password-1", "new-password-22")
  })

  it("an account that only uses email codes is offered to set a password, by email link", async () => {
    me = meBody({ hasPassword: false } as Partial<Me>)
    await render(<SecurityView />, "Set a password to sign in")
    expect(m.container.querySelector("#current-password")).toBeNull()
    await click(btn("Email me a link to set a password"))
    expect(mocks.requestPasswordReset).toHaveBeenCalledWith("ada@example.com", "/reset-password")
    await waitFor(() => m.container.textContent?.includes("We sent a link to ada@example.com") ?? false)
  })
})

describe("workspace settings", () => {
  it("owner renames the workspace and sees the delete action", async () => {
    await render(<WorkspaceView />, "Workspace name")
    expect(btn("Delete workspace")).toBeTruthy()
    await type(m.container.querySelector("#workspace-name-setting"), "Acme Labs")
    await submit(m.container.querySelector("#workspace-name-setting")!.closest("form"))
    await waitFor(() => mocks.apiFetch.mock.calls.some(([u, i]) => String(u).endsWith("/api/organizations/current") && i?.method === "PATCH"))
  })

  it("an admin edits but cannot delete", async () => {
    me = meBody({ orgRole: "admin" })
    await render(<WorkspaceView />, "Workspace name")
    expect(btn("Delete workspace")).toBeUndefined()
  })

  it("a member sees the settings read-only, with no delete action", async () => {
    me = meBody({ orgRole: "member" })
    await render(<WorkspaceView />, "Only the owner and admins")
    expect(m.container.querySelector("#workspace-name-setting")).toBeNull()
    expect(m.container.textContent).toContain("Acme")
    expect(btn("Delete workspace")).toBeUndefined()
  })
})
