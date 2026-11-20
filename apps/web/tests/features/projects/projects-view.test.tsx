// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Suspense } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), toast: vi.fn() }))
vi.mock("@workspace/ui/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }))

import { t } from "@workspace/i18n"

import { meKeys } from "@/features/auth"
import { ProjectsView } from "@/features/projects"
import { UPGRADE_REQUIRED_EVENT } from "@/lib/api-fetch"

import { NAV, visibleItems } from "../../../config/nav"
import { byText, click, mount, type, waitFor } from "../../helpers/dom"
import { meBody } from "../../helpers/me"

let m: ReturnType<typeof mount>
let projects: { id: string; name: string; description: string; createdAt: string; updatedAt: string }[]
beforeEach(() => {
  m = mount()
  vi.clearAllMocks()
  projects = [{ id: "p1", name: "Launch", description: "Q1", createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z" }]
  // The network edge only: the real apiFetch (402 handling) and hc client run.
  mocks.fetch.mockImplementation(async (url: string, init?: RequestInit) => {
    const path = new URL(String(url), "http://x").pathname
    const method = init?.method ?? "GET"
    if (path === "/api/projects" && method === "GET") return Response.json({ projects })
    if (path === "/api/projects/export") return new Response('"name"\r\n"Launch"', { headers: { "content-type": "text/csv" } })
    return Response.json({ ok: true })
  })
  vi.stubGlobal("fetch", mocks.fetch)
})
afterEach(async () => {
  await m.unmount()
  vi.unstubAllGlobals()
})

async function render() {
  const client = new QueryClient()
  client.setQueryData(meKeys.detail(), meBody())
  await m.render(
    <QueryClientProvider client={client}>
      <Suspense fallback="loading">
        <ProjectsView />
      </Suspense>
    </QueryClientProvider>,
  )
  await waitFor(() => !!m.container.textContent?.includes("Launch"))
}
const sent = () => mocks.fetch.mock.calls.filter(([, init]) => init?.method && init.method !== "GET").map(([url, init]) => ({ method: init.method, path: new URL(String(url), "http://x").pathname, body: init.body ? JSON.parse(String(init.body)) : undefined }))

describe("ProjectsView", () => {
  it("lists the workspace's projects", async () => {
    await render()
    expect(m.container.textContent).toContain("Q1")
    expect(m.container.textContent).toContain(t("projects.listHeading", { count: 1 }))
  })

  it("creates a project from the form", async () => {
    await render()
    await type(m.container.querySelector("#project-name"), "  Roadmap ")
    await click(byText(t("projects.create")))
    await waitFor(() => sent().length > 0)
    expect(sent()[0]).toEqual({ method: "POST", path: "/api/projects", body: { name: "Roadmap", description: "" } })
  })

  it("renames a project", async () => {
    await render()
    await click(byText(t("projects.rename")))
    await type(m.container.querySelector(`input[aria-label="${t("projects.nameLabel")}"]`), "Relaunch")
    await click(byText(t("projects.save")))
    await waitFor(() => sent().length > 0)
    expect(sent()[0]).toEqual({ method: "PATCH", path: "/api/projects/p1", body: { name: "Relaunch" } })
  })

  it("deletes a project only after its name is typed", async () => {
    await render()
    await click(byText(t("projects.delete")))
    const dialog = document.querySelector('[role="alertdialog"]')!
    const confirm = [...dialog.querySelectorAll("button")].find((b) => b.textContent === t("projects.delete"))!
    expect(confirm.disabled).toBe(true)
    await type(dialog.querySelector("input"), "Launch")
    await click(confirm)
    await waitFor(() => sent().length > 0)
    expect(sent()[0]).toMatchObject({ method: "DELETE", path: "/api/projects/p1" })
  })

  it("a refused create (402 at the limit) opens the upgrade dialog, not an error toast", async () => {
    mocks.fetch.mockImplementation(async (url: string, init?: RequestInit) =>
      init?.method === "POST" ? Response.json({ error: "upgrade_required", reason: "projects", used: 3, limit: 3 }, { status: 402 }) : Response.json({ projects }),
    )
    const upgrade = vi.fn()
    window.addEventListener(UPGRADE_REQUIRED_EVENT, upgrade)
    await render()
    await type(m.container.querySelector("#project-name"), "One more")
    await click(byText(t("projects.create")))
    await waitFor(() => upgrade.mock.calls.length > 0)
    expect((upgrade.mock.calls[0]![0] as CustomEvent).detail).toMatchObject({ reason: "projects", used: 3, limit: 3 })
    expect(mocks.toast).not.toHaveBeenCalled()
    window.removeEventListener(UPGRADE_REQUIRED_EVENT, upgrade)
  })

  it("exports a CSV download", async () => {
    const createObjectURL = vi.fn(() => "blob:csv")
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    await render()
    await click(byText(t("projects.export")))
    await waitFor(() => createObjectURL.mock.calls.length > 0)
    expect(mocks.fetch.mock.calls.some(([url]) => String(url).endsWith("/api/projects/export"))).toBe(true)
  })
})

describe("nav", () => {
  it("shows Projects in the sidebar and mobile sheet for every role", () => {
    for (const role of ["owner", "admin", "member"] as const) expect(visibleItems(NAV, { role, features: [] }).map((i) => i.href)).toContain("/projects")
  })
})
