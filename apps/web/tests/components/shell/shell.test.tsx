// @vitest-environment happy-dom
// Only the network boundary (apiFetch) is mocked: useMe and the real shell components run.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, Suspense } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn(), pathname: "/dashboard" as string | null }))
vi.mock("@/lib/api-fetch", async (orig) => ({ ...(await orig<object>()), apiFetch: mocks.apiFetch }))
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))

import { ShellHeaderActions } from "../../../components/shell/shell-header-actions"
import { ShellSidebar } from "../../../components/shell/shell-sidebar"
import { SidebarNav } from "../../../components/shell/sidebar-nav"
import { NAV, visibleItems, type NavItem } from "../../../config/nav"
import { click, mount, waitFor } from "../../helpers/dom"
import { meBody } from "../../helpers/me"

let m: ReturnType<typeof mount>
beforeEach(() => {
  m = mount()
  mocks.apiFetch.mockReset()
  mocks.pathname = "/dashboard"
})
afterEach(() => m.unmount())

async function render(node: React.ReactNode, me = meBody()) {
  mocks.apiFetch.mockImplementation(async () => Response.json(me))
  await m.render(
    <QueryClientProvider client={new QueryClient()}>
      <Suspense fallback="loading">{node}</Suspense>
    </QueryClientProvider>,
  )
  await waitFor(() => !!m.container.textContent && m.container.textContent !== "loading")
}
const links = () => [...m.container.querySelectorAll("a")].map((a) => a.getAttribute("href"))

describe("sidebar", () => {
  it("shows the switcher and the nav items, highlighting the current page", async () => {
    await render(<ShellSidebar />)
    expect(m.container.textContent).toContain("Acme")
    expect(links()).toEqual(expect.arrayContaining(["/dashboard", "/team"]))
    expect(m.container.querySelector('a[href="/dashboard"]')?.getAttribute("aria-current")).toBe("page")
    expect(m.container.querySelector('a[href="/team"]')?.getAttribute("aria-current")).toBeNull()
  })

  it("a sub-page highlights its section", async () => {
    mocks.pathname = "/team/invites"
    await render(<SidebarNav items={NAV} />)
    expect(m.container.querySelector('a[href="/team"]')?.getAttribute("aria-current")).toBe("page")
  })

  it("the platform admin link appears only for platform admins", async () => {
    await render(<ShellSidebar />)
    expect(links()).not.toContain("/admin")
    await m.unmount()
    m = mount()
    await render(<ShellSidebar />, meBody({ isAdmin: true }))
    expect(links()).toContain("/admin")
  })
})

describe("nav restrictions", () => {
  const items: NavItem[] = [
    { href: "/a", label: "nav.dashboard", Icon: () => null },
    { href: "/owners", label: "nav.team", Icon: () => null, roles: ["owner", "admin"] },
    { href: "/exports", label: "nav.team", Icon: () => null, feature: "export" },
  ]
  it("hides items restricted to other roles or to plans without the feature", () => {
    expect(visibleItems(items, { role: "member", features: [] }).map((i) => i.href)).toEqual(["/a"])
    expect(visibleItems(items, { role: "admin", features: ["export"] }).map((i) => i.href)).toEqual(["/a", "/owners", "/exports"])
  })
})

describe("header user menu", () => {
  it("shows name and email and links to profile, security, workspace and billing; signs out", async () => {
    await render(<ShellHeaderActions />)
    expect(m.container.textContent).toContain("Ada Lovelace")
    // Radix opens a dropdown on pointerdown, not click.
    const trigger = m.container.querySelector("[data-slot=dropdown-menu-trigger]")!
    await act(async () => void trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 })))
    await waitFor(() => (document.body.textContent ?? "").includes("Sign out"))
    const menu = document.body.textContent ?? ""
    for (const label of ["ada@example.com", "Profile", "Security", "Workspace", "Billing", "Sign out"]) expect(menu).toContain(label)
    expect(menu).not.toContain("Platform admin")
  })

  it("the mobile sheet carries the same nav and settings", async () => {
    await render(<ShellHeaderActions />)
    await click(m.container.querySelector("button[aria-label='Open menu']"))
    await waitFor(() => (document.body.textContent ?? "").includes("Sign out"))
    const sheet = document.body.textContent ?? ""
    for (const label of ["Dashboard", "Team", "Profile", "Billing", "Sign out"]) expect(sheet).toContain(label)
  })
})

describe("adding a nav item (AGENTS.md)", () => {
  it("an item pushed to NAV shows in the sidebar and the mobile sheet", async () => {
    NAV.push({ href: "/reports", label: "nav.dashboard", Icon: () => null })
    try {
      await render(<ShellSidebar />)
      expect(links()).toContain("/reports")
      await m.unmount()
      m = mount()
      await render(<ShellHeaderActions />)
      await click(m.container.querySelector("button[aria-label='Open menu']"))
      await waitFor(() => !!document.querySelector('[role=dialog] a[href="/reports"]'))
    } finally {
      NAV.pop()
    }
  })
})
