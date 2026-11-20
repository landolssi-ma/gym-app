// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, Suspense } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn(), stopImpersonation: vi.fn(async () => ({ ok: true })), assign: vi.fn() }))
vi.mock("@/lib/api-fetch", async (orig) => ({ ...(await orig<object>()), apiFetch: mocks.apiFetch }))
vi.mock("@workspace/auth/client", () => ({ stopImpersonation: mocks.stopImpersonation, signOut: vi.fn() }))

import { ImpersonationBanner, OrgChangedModal, OrgSwitcher } from "@/features/auth"
import { getActiveOrgId, setActiveOrgId } from "@/lib/active-org"
import { notifyLocalOrgChange } from "@/lib/broadcast"

import { click, mount, type, waitFor } from "../../helpers/dom"
import { meBody } from "../../helpers/me"

let m: ReturnType<typeof mount>
beforeEach(() => {
  m = mount()
  mocks.apiFetch.mockReset()
  mocks.assign.mockReset()
  Object.defineProperty(window, "location", { value: { ...window.location, assign: mocks.assign, reload: vi.fn() }, configurable: true })
})
afterEach(async () => {
  await m.unmount()
  vi.unstubAllGlobals()
})

const body = () => document.body.textContent ?? ""
function routes(me = meBody(), extra: (url: string, init?: RequestInit) => Response | undefined = () => undefined) {
  mocks.apiFetch.mockImplementation(async (url: string | URL, init?: RequestInit) => extra(String(url), init) ?? Response.json(me))
  // The org-changed modal reads /api/me with plain fetch, deliberately without the x-org-id header.
  vi.stubGlobal("fetch", async () => Response.json(me))
}
async function render(node: React.ReactNode) {
  await m.render(
    <QueryClientProvider client={new QueryClient()}>
      <Suspense fallback="loading">{node}</Suspense>
    </QueryClientProvider>,
  )
  await waitFor(() => !!m.container.textContent && m.container.textContent !== "loading")
}
const openMenu = async () => {
  const trigger = m.container.querySelector("[data-slot=dropdown-menu-trigger]")!
  await act(async () => void trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 })))
}
const menuItem = (text: string) => [...document.querySelectorAll<HTMLElement>("[role=menuitem]")].find((el) => el.textContent?.includes(text))

describe("workspace switcher", () => {
  it("lists the user's workspaces and marks the active one", async () => {
    routes()
    await render(<OrgSwitcher />)
    await openMenu()
    expect(menuItem("Acme")?.getAttribute("aria-current")).toBe("true")
    expect(menuItem("Second")?.getAttribute("aria-current")).toBe("false")
  })

  it("switching asks the server first, then updates this tab and tells the other tabs; the URL does not change", async () => {
    routes(meBody(), (url) => (url.includes("/switch") ? Response.json({ activeId: "org_2" }) : undefined))
    const otherTab = new BroadcastChannel("org-sync")
    const heard: string[] = []
    otherTab.onmessage = (e) => heard.push(e.data.orgId)
    await render(<OrgSwitcher />)
    await openMenu()
    await click(menuItem("Second"))
    await waitFor(() => getActiveOrgId() === "org_2")
    expect(mocks.apiFetch.mock.calls.some(([url, init]) => String(url).endsWith("/api/organizations/org_2/switch") && init?.method === "POST")).toBe(true)
    await waitFor(() => heard.includes("org_2"))
    expect(mocks.assign).not.toHaveBeenCalled()
    otherTab.close()
  })

  it("create workspace posts the name and reloads into it", async () => {
    routes(meBody(), (url, init) => (url.endsWith("/api/organizations") && init?.method === "POST" ? Response.json({ id: "org_new", name: "New" }, { status: 201 }) : undefined))
    await render(<OrgSwitcher />)
    await openMenu()
    await click(menuItem("Create workspace"))
    await type(document.querySelector("#workspace-name"), "New")
    await act(async () => document.querySelector<HTMLFormElement>("[role=dialog] form")!.requestSubmit())
    await waitFor(() => mocks.assign.mock.calls.length > 0)
    expect(mocks.assign).toHaveBeenCalledWith("/dashboard")
    const post = mocks.apiFetch.mock.calls.find(([url, init]) => String(url).endsWith("/api/organizations") && init?.method === "POST")!
    expect(JSON.parse(String(post[1]!.body))).toEqual({ name: "New" })
  })
})

describe("workspace changed in another tab", () => {
  it("a stale tab's 409 opens a modal that cannot be dismissed", async () => {
    routes()
    setActiveOrgId("org_1")
    await render(
      <>
        <span>page</span>
        <OrgChangedModal />
      </>,
    )
    await act(async () => notifyLocalOrgChange())
    await waitFor(() => body().includes("Your workspace changed in another tab."))
    await act(async () => void document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })))
    expect(body()).toContain("Your workspace changed in another tab.")
    expect(body()).toContain("Reload")
  })
})

describe("removed from the workspace", () => {
  it("moves to the server's fallback workspace without the modal", async () => {
    routes()
    setActiveOrgId("org_gone")
    await render(
      <>
        <span>page</span>
        <OrgChangedModal />
      </>,
    )
    await act(async () => notifyLocalOrgChange())
    await waitFor(() => getActiveOrgId() === "org_1")
    expect(body()).not.toContain("Your workspace changed in another tab.")
  })
})

describe("impersonation banner", () => {
  it("names the impersonated user, and Stop ends it and returns to the backoffice", async () => {
    routes(meBody({ impersonating: true }))
    await render(
      <>
        <span>page</span>
        <ImpersonationBanner />
      </>,
    )
    await waitFor(() => body().includes("Viewing as ada@example.com"))
    await click([...document.querySelectorAll("button")].find((b) => b.textContent === "Stop"))
    await waitFor(() => mocks.assign.mock.calls.length > 0)
    expect(mocks.stopImpersonation).toHaveBeenCalled()
    expect(mocks.assign).toHaveBeenCalledWith("/admin/users/u1")
  })

  it("renders nothing when not impersonating", async () => {
    routes()
    await render(
      <>
        <span>page</span>
        <ImpersonationBanner />
      </>,
    )
    await act(async () => new Promise((r) => setTimeout(r, 30)))
    expect(body()).not.toContain("Viewing as")
  })
})

