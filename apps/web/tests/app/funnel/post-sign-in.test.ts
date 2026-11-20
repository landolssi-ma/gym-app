import { beforeEach, describe, expect, it, vi } from "vitest"

import { meBody } from "../../helpers/me"

const mocks = vi.hoisted(() => ({ getMeResult: vi.fn(), redirect: vi.fn((to: string) => { throw new Error(`REDIRECT:${to}`) }) }))
vi.mock("@/lib/api-server", () => ({ getMeResult: mocks.getMeResult }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))

const { default: PostSignIn } = await import("../../../app/post-sign-in/page")
const { default: CheckoutSuccess } = await import("../../../app/(app)/checkout-success/page")
const go = (next?: string) => PostSignIn({ searchParams: Promise.resolve(next ? { next } : {}) })
beforeEach(() => vi.clearAllMocks())

describe("post sign-in", () => {
  it("a brand new user goes to the survey", async () => {
    mocks.getMeResult.mockResolvedValue({ ok: true, data: meBody({ live: false, onboarding: null } as never) })
    await expect(go()).rejects.toThrow("REDIRECT:/onboarding")
  })

  it("survey done, no live subscription: the plans page", async () => {
    mocks.getMeResult.mockResolvedValue({ ok: true, data: meBody({ live: false, onboarding: { answers: {}, completedAt: "2026-11-08" } } as never) })
    await expect(go()).rejects.toThrow("REDIRECT:/plans")
  })

  it("a returning subscriber (or an invitee to a live workspace) goes to the return path or the dashboard", async () => {
    mocks.getMeResult.mockResolvedValue({ ok: true, data: meBody({ live: true, onboarding: null } as never) })
    await expect(go()).rejects.toThrow("REDIRECT:/dashboard")
    await expect(go("/team")).rejects.toThrow("REDIRECT:/team")
    await expect(go("//evil.example")).rejects.toThrow("REDIRECT:/dashboard")
  })
})

describe("checkout return", () => {
  it("a checkout that was left goes back to the plans page", async () => {
    await expect(CheckoutSuccess({ searchParams: Promise.resolve({ status: "cancelled" }) })).rejects.toThrow("REDIRECT:/plans")
  })

  it("a completed checkout waits for activation", async () => {
    expect(await CheckoutSuccess({ searchParams: Promise.resolve({ status: "succeeded" }) })).toBeTruthy()
  })
})
