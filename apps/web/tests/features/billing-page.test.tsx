// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, Suspense } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn(), assign: vi.fn() }))
vi.mock("@/lib/api-fetch", async (orig) => ({ ...(await orig<object>()), apiFetch: mocks.apiFetch }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }), usePathname: () => "/billing" }))

import { BillingDashboard } from "../../app/(app)/(shell)/billing/billing-dashboard"

import { click, mount, type, waitFor } from "../helpers/dom"
import { meBody } from "../helpers/me"

const sub = (over = {}) => ({ plan: "pro", interval: "month", status: "active", trialEndsAt: null, currentPeriodEnd: "2026-12-01T00:00:00Z", cancelAtPeriodEnd: false, pendingPlan: null, hasPortal: true, ...over })
const billing = (over: Record<string, unknown> = {}) => ({ subscription: sub(), live: true, trialEligible: false, features: ["export"], limits: { seats: { used: 2, limit: 5 } }, meters: {}, ...over })

let m: ReturnType<typeof mount>
beforeEach(() => {
  m = mount()
  mocks.apiFetch.mockReset()
  mocks.assign.mockReset()
  Object.defineProperty(window, "location", { value: { ...window.location, assign: mocks.assign }, configurable: true })
})
afterEach(() => m.unmount())

type Route = (url: string, init?: RequestInit) => Response | undefined
async function render(role: "owner" | "admin" | "member", data = billing(), extra: Route = () => undefined) {
  mocks.apiFetch.mockImplementation(async (url: string, init?: RequestInit) => extra(String(url), init) ?? Response.json(String(url).endsWith("/api/billing") ? data : meBody({ orgRole: role })))
  await m.render(
    <QueryClientProvider client={new QueryClient()}>
      <Suspense fallback="loading">
        <BillingDashboard />
      </Suspense>
    </QueryClientProvider>,
  )
  await waitFor(() => m.container.textContent?.includes("Danger zone") ?? false)
}
const text = () => m.container.textContent ?? ""
const button = (label: string) => [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === label)
const posted = (path: string) => mocks.apiFetch.mock.calls.filter(([url, init]) => String(url).endsWith(path) && init?.method === "POST")

describe("billing page", () => {
  it("shows plan, interval price, status, renewal date and usage against limits", async () => {
    await render("owner")
    for (const s of ["Pro", "$79", "/month", "Active", "Renews December 1, 2026", "Seats", "2 of 5"]) expect(text()).toContain(s)
  })

  it("owner gets change plan, the customer portal, cancel, and both delete actions", async () => {
    await render("owner")
    for (const b of ["Change plan", "Payment method and invoices", "Cancel subscription", "Delete workspace", "Delete account"]) expect(button(b), b).toBeTruthy()
  })

  it("other roles see plan and status read-only", async () => {
    await render("admin")
    expect(text()).toContain("Only the workspace owner can change billing.")
    for (const b of ["Change plan", "Cancel subscription", "Payment method and invoices", "Delete workspace"]) expect(button(b), b).toBeUndefined()
    expect(button("Delete account")).toBeTruthy()
  })

  it("past due: the failed payment and a portal button", async () => {
    await render("owner", billing({ subscription: sub({ status: "past_due" }) }), (url) => (url.endsWith("/portal") ? Response.json({ url: "https://portal.test/p" }) : undefined))
    expect(text()).toContain("Your last payment didn't go through")
    await click([...document.querySelectorAll("button")].find((b) => b.textContent === "Payment method and invoices"))
    await waitFor(() => mocks.assign.mock.calls.length > 0)
    expect(mocks.assign).toHaveBeenCalledWith("https://portal.test/p")
  })

  it("scheduled cancellation: the end date and Resume", async () => {
    await render("owner", billing({ subscription: sub({ cancelAtPeriodEnd: true }) }), (url) => (url.endsWith("/resume") ? Response.json({ ok: true }) : undefined))
    expect(text()).toContain("This subscription ends on December 1, 2026")
    expect(button("Cancel subscription")).toBeUndefined()
    await click(button("Resume subscription"))
    await waitFor(() => posted("/api/billing/resume").length === 1)
  })

  it("no subscription: owners are sent to the plans page", async () => {
    await render("owner", billing({ subscription: null, live: false }))
    expect(text()).toContain("This workspace has no active subscription.")
    expect(m.container.querySelector('a[href="/plans"]')).not.toBeNull()
  })

  it("plan change previews the prorated amount, and an over-limit plan explains why", async () => {
    await render("owner", billing(), (url, init) => {
      if (!url.endsWith("/change-plan/preview")) return undefined
      return JSON.parse(String(init!.body)).plan === "starter" ? Response.json({ error: "exceeds_plan_limits", limit: "seats" }, { status: 409 }) : Response.json({ chargeUsd: 42.5 })
    })
    await click(button("Change plan"))
    const select = document.querySelector("#change-plan") as unknown as HTMLSelectElement
    await act(async () => {
      select.value = "business"
      select.dispatchEvent(new Event("change", { bubbles: true }))
    })
    await waitFor(() => (document.body.textContent ?? "").includes("You'll be charged $42.50 now"))
    await act(async () => {
      select.value = "starter"
      select.dispatchEvent(new Event("change", { bubbles: true }))
    })
    await waitFor(() => (document.body.textContent ?? "").includes("Your current usage is above that plan's limits."))
    expect(button("Confirm change")?.disabled).toBe(true)
  })

  it("deleting the workspace needs its exact name, then reloads into the next workspace", async () => {
    await render("owner", billing(), (url) => (url.endsWith("/api/organizations/current/delete") ? Response.json({ activeId: "org_2" }) : undefined))
    await click(button("Delete workspace"))
    const confirm = () => [...document.querySelectorAll<HTMLButtonElement>("[role=alertdialog] button")].find((b) => b.textContent?.trim() === "Delete")!
    expect(confirm().disabled).toBe(true)
    await type(document.querySelector("[role=alertdialog] input"), "acme")
    expect(confirm().disabled).toBe(true)
    await type(document.querySelector("[role=alertdialog] input"), "Acme")
    expect(confirm().disabled).toBe(false)
    await click(confirm())
    await waitFor(() => mocks.assign.mock.calls.length > 0)
    expect(JSON.parse(String(posted("/api/organizations/current/delete")[0]![1]!.body))).toEqual({ confirm: "Acme" })
    expect(mocks.assign).toHaveBeenCalledWith("/dashboard")
  })

  it("account deletion refused while owning a shared workspace shows why", async () => {
    await render("owner", billing(), (url) => (url.endsWith("/api/account/delete") ? Response.json({ error: "owns_organization_with_members" }, { status: 409 }) : undefined))
    await click(button("Delete account"))
    await type(document.querySelector("[role=alertdialog] input"), "ada@example.com")
    await click([...document.querySelectorAll<HTMLButtonElement>("[role=alertdialog] button")].find((b) => b.textContent?.trim() === "Delete"))
    await waitFor(() => (document.body.textContent ?? "").includes("You own a workspace with other members"))
    expect(mocks.assign).not.toHaveBeenCalled()
  })
})
