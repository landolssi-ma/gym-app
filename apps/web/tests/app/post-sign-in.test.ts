import { beforeEach, describe, expect, it, vi } from "vitest"

import { meBody } from "../helpers/me"

const mocks = vi.hoisted(() => ({
  getMeResult: vi.fn(),
  redirect: vi.fn((to: string) => { throw new Error(`REDIRECT:${to}`) }),
}))

vi.mock("@/lib/api-server", () => ({ getMeResult: mocks.getMeResult }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))

const { default: PostSignIn } = await import("../../app/post-sign-in/page")

beforeEach(() => vi.clearAllMocks())

describe("post sign-in", () => {
  it("sends an incomplete profile to onboarding", async () => {
    mocks.getMeResult.mockResolvedValue({ ok: true, data: meBody({ profileComplete: false }) })
    await expect(PostSignIn({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT:/onboarding")
  })

  it("sends a complete profile to the dashboard", async () => {
    mocks.getMeResult.mockResolvedValue({ ok: true, data: meBody({ profileComplete: true }) })
    await expect(PostSignIn({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT:/dashboard")
  })
})
