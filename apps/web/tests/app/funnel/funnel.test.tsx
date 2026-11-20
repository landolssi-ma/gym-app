// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, Suspense } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const replace = vi.fn()
  // Stable like Next's own router, so effects depending on it do not restart each render.
  return { apiFetch: vi.fn(), replace, router: { replace }, assign: vi.fn(), pathname: "/dashboard" }
})
vi.mock("@/lib/api-fetch", async (orig) => ({ ...(await orig<object>()), apiFetch: mocks.apiFetch }))
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router, usePathname: () => mocks.pathname }))

import { SURVEY } from "@workspace/api/survey"

import { Survey } from "../../../app/(app)/onboarding/survey"
import { ActivationPoll, MAX_ATTEMPTS, POLL_MS } from "../../../app/(app)/checkout-success/activation-poll"
import { PlanCards } from "../../../app/(app)/plans/plan-cards"
import { OnboardingGate } from "@/features/billing"
import type { Me } from "@/features/auth"

import { click, mount, waitFor } from "../../helpers/dom"
import { meBody } from "../../helpers/me"

let m: ReturnType<typeof mount>
let me: Me
beforeEach(() => {
  m = mount()
  vi.clearAllMocks()
  mocks.pathname = "/dashboard"
  me = meBody()
  Object.defineProperty(window, "location", { value: { ...window.location, assign: mocks.assign }, configurable: true })
  mocks.apiFetch.mockImplementation(async (url: string) => {
    if (String(url).endsWith("/api/billing/checkout")) return Response.json({ url: "https://checkout.test/s" }, { status: 201 })
    if (String(url).endsWith("/api/me/onboarding")) return Response.json({ onboarding: {} })
    return Response.json(me)
  })
})
afterEach(async () => {
  vi.useRealTimers()
  await m.unmount()
})

async function render(node: React.ReactNode, ready: (text: string) => boolean = (s) => !!s && s !== "loading") {
  await m.render(
    <QueryClientProvider client={new QueryClient()}>
      <Suspense fallback="loading">{node}</Suspense>
    </QueryClientProvider>,
  )
  await waitFor(() => ready(m.container.textContent ?? ""))
}
const btn = (label: string) => [...m.container.querySelectorAll("button")].find((b) => b.textContent?.trim().startsWith(label))
const radio = (label: string) => [...m.container.querySelectorAll("[role=radio]")].find((b) => b.textContent?.includes(label))
const onboardingPuts = () => mocks.apiFetch.mock.calls.filter(([u, i]) => String(u).endsWith("/api/me/onboarding") && i?.method === "PUT").map(([, i]) => JSON.parse(String(i!.body)))

describe("survey", () => {
  it("one question at a time; each answer is saved; finishing completes and moves on", async () => {
    me = meBody({ onboarding: null } as Partial<Me>)
    await render(<Survey />)
    expect(m.container.textContent).toContain("What best describes you?")
    expect(btn("Next")?.disabled).toBe(true)
    await click(radio("Founder"))
    await click(btn("Next"))
    await click(radio("Just me"))
    await click(btn("Next"))
    expect(m.container.textContent).toContain("How did you hear about us?")
    await click(btn("Finish"))
    await waitFor(() => mocks.replace.mock.calls.length > 0)
    expect(onboardingPuts()).toEqual([{ answers: { role: "founder" } }, { answers: { teamSize: "1" } }, { answers: { role: "founder", teamSize: "1" }, complete: true }])
    expect(mocks.replace).toHaveBeenCalledWith("/post-sign-in")
  })

  it("a refused completion shows the reason and stays on the survey", async () => {
    me = meBody({ onboarding: { answers: { role: "founder", teamSize: "1" } } } as Partial<Me>)
    mocks.apiFetch.mockImplementation(async (url: string) => (String(url).endsWith("/api/me/onboarding") ? Response.json({ error: "incomplete" }, { status: 400 }) : Response.json(me)))
    await render(<Survey />)
    await click(btn("Finish"))
    await waitFor(() => m.container.textContent?.includes("Some answers are missing.") ?? false)
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it("a question added to the config is shown with no other change", async () => {
    SURVEY.push({ id: "goal", label: "survey.title", required: false, options: [{ value: "a", label: "survey.other" }] })
    try {
      me = meBody({ onboarding: { answers: { role: "founder", teamSize: "1", source: "google" } } } as Partial<Me>)
      await render(<Survey />)
      expect(m.container.textContent).toContain("Question 4 of 4")
      expect(m.container.textContent).toContain("Tell us about you")
    } finally {
      SURVEY.pop()
    }
  })
})

describe("plans page", () => {
  it("an eligible owner sees each plan with its trial; yearly switches prices; choosing starts checkout", async () => {
    me = meBody({ live: false, subscription: null, trialEligible: true })
    await render(<PlanCards />)
    for (const s of ["Starter", "Pro", "Business", "$19", "$79", "14-day free trial", "1 seat", "Unlimited projects"]) expect(m.container.textContent).toContain(s)
    await click(radio("Yearly"))
    expect(m.container.textContent).toContain("$790")
    await click([...m.container.querySelectorAll("button")].filter((b) => b.textContent === "Start free trial")[1])
    await waitFor(() => mocks.assign.mock.calls.length > 0)
    const post = mocks.apiFetch.mock.calls.find(([u]) => String(u).endsWith("/api/billing/checkout"))!
    expect(JSON.parse(String(post[1]!.body))).toEqual({ plan: "pro", interval: "year" })
    expect(mocks.assign).toHaveBeenCalledWith("https://checkout.test/s")
  })

  it("a workspace that is not trial-eligible sees no trial", async () => {
    me = meBody({ live: false, subscription: null, trialEligible: false })
    await render(<PlanCards />)
    expect(m.container.textContent).not.toContain("free trial")
    expect(btn("Subscribe")).toBeTruthy()
  })

  it("non-owners see the cards without checkout buttons and are asked to contact the owner", async () => {
    me = meBody({ live: false, subscription: null, orgRole: "admin" })
    await render(<PlanCards />)
    expect(m.container.textContent).toContain("Only the workspace owner can choose a plan")
    expect(btn("Subscribe")).toBeUndefined()
    expect(btn("Start free trial")).toBeUndefined()
  })
})

describe("checkout success", () => {
  it("goes to the dashboard once the webhook makes the subscription live", async () => {
    vi.useFakeTimers()
    let calls = 0
    mocks.apiFetch.mockImplementation(async () => Response.json({ ...me, live: ++calls >= 3 }))
    await m.render(<ActivationPoll />)
    for (let i = 0; i < 5 && !mocks.replace.mock.calls.length; i++) await act(async () => vi.advanceTimersByTimeAsync(POLL_MS))
    expect(mocks.replace).toHaveBeenCalledWith("/dashboard")
  })

  it("after about 30 seconds without activation: the delay message with retry and support", async () => {
    vi.useFakeTimers()
    mocks.apiFetch.mockImplementation(async () => Response.json({ ...me, live: false }))
    await m.render(<ActivationPoll />)
    expect(POLL_MS * MAX_ATTEMPTS).toBe(30_000)
    for (let i = 0; i <= MAX_ATTEMPTS + 1; i++) await act(async () => vi.advanceTimersByTimeAsync(POLL_MS))
    expect(mocks.apiFetch).toHaveBeenCalledTimes(MAX_ATTEMPTS)
    expect(m.container.textContent).toContain("Activation is taking longer than usual")
    expect(m.container.textContent).toContain("support@example.com")
    expect(btn("Check again")).toBeTruthy()
    expect(mocks.replace).not.toHaveBeenCalled()
  })
})

describe("onboarding gate", () => {
  it("a workspace without a live subscription is sent from a product page to the plans page", async () => {
    me = meBody({ live: false })
    mocks.pathname = "/projects"
    await render(
      <OnboardingGate>
        <p>PRODUCT</p>
      </OnboardingGate>,
      () => true,
    )
    await waitFor(() => mocks.replace.mock.calls.length > 0)
    expect(mocks.replace).toHaveBeenCalledWith("/plans")
    expect(m.container.textContent).not.toContain("PRODUCT")
  })

  it.each(["/billing", "/settings/profile", "/team"])("%s stays reachable", async (path) => {
    me = meBody({ live: false })
    mocks.pathname = path
    await render(
      <OnboardingGate>
        <p>PAGE</p>
      </OnboardingGate>,
      (s) => s.includes("PAGE"),
    )
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it("a live workspace sees the product page", async () => {
    await render(
      <OnboardingGate>
        <p>PRODUCT</p>
      </OnboardingGate>,
      (s) => s.includes("PRODUCT"),
    )
  })
})
