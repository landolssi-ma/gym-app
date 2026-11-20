import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { meBody } from "../../helpers/me"

const mocks = vi.hoisted(() => ({ getMeResult: vi.fn(), isSignedInFresh: vi.fn(), redirect: vi.fn((to: string) => { throw new Error(`REDIRECT:${to}`) }) }))
vi.mock("@/lib/api-server", () => ({ getMeResult: mocks.getMeResult, isSignedInFresh: mocks.isSignedInFresh }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, usePathname: () => "/dashboard", useRouter: () => ({ replace: vi.fn() }) }))

// The gate reads the seeded /api/me cache on the client; here it just passes the page through.
vi.mock("@/features/billing", () => ({ OnboardingGate: ({ children }: { children: React.ReactNode }) => children }))

const { default: ShellLayout } = await import("../../../app/(app)/(shell)/layout")
beforeEach(() => vi.clearAllMocks())

describe("(shell) layout", () => {
  it("a refused session goes to sign-in when the sign-in page agrees the visitor is signed out", async () => {
    mocks.getMeResult.mockResolvedValue({ ok: false, status: 401, error: "unauthorized" })
    mocks.isSignedInFresh.mockResolvedValue(false)
    await expect(ShellLayout({ children: "page" })).rejects.toThrow("REDIRECT:/sign-in")
  })

  it("any other refusal reaches the error page instead of looping through sign-in", async () => {
    mocks.getMeResult.mockResolvedValue({ ok: false, status: 500, error: "internal" })
    mocks.isSignedInFresh.mockResolvedValue(true)
    await expect(ShellLayout({ children: "page" })).rejects.toThrow("GET /api/me failed: 500")
  })

  it("renders the page inside the shell", async () => {
    mocks.getMeResult.mockResolvedValue({ ok: true, data: meBody() })
    const html = renderToStaticMarkup(await ShellLayout({ children: "PAGE-CONTENT" }))
    expect(html).toContain("PAGE-CONTENT")
    expect(html).toContain("<aside")
  })

  it("a suspended workspace shows the notice with the support email instead of the page", async () => {
    mocks.getMeResult.mockResolvedValue({ ok: true, data: meBody({ activeOrganization: { ...meBody().activeOrganization, suspended: true } }) })
    const html = renderToStaticMarkup(await ShellLayout({ children: "PAGE-CONTENT" }))
    expect(html).not.toContain("PAGE-CONTENT")
    expect(html).toContain("This workspace is suspended")
    expect(html).toContain("support@example.com")
  })
})
