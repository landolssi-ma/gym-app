import { beforeEach, describe, expect, it, vi } from "vitest"

const { isSignedInFresh, redirect } = vi.hoisted(() => ({ isSignedInFresh: vi.fn(), redirect: vi.fn() }))
vi.mock("@/lib/api-server", () => ({ isSignedInFresh }))
vi.mock("next/navigation", () => ({ redirect }))

const { default: SignInPage } = await import("../../../app/sign-in/page")
const params = (p: Record<string, string>) => ({ searchParams: Promise.resolve(p) })

beforeEach(() => redirect.mockClear())

describe("sign-in page", () => {
  it("a signed-in visitor goes to the validated return path", async () => {
    isSignedInFresh.mockResolvedValue(true)
    await SignInPage(params({ next: "/projects" }))
    expect(redirect).toHaveBeenCalledWith("/projects")
  })

  it("an unsafe return path falls back to /post-sign-in", async () => {
    isSignedInFresh.mockResolvedValue(true)
    await SignInPage(params({ next: "//evil.example" }))
    expect(redirect).toHaveBeenCalledWith("/post-sign-in")
  })

  it("a signed-out visitor gets the form", async () => {
    isSignedInFresh.mockResolvedValue(false)
    expect(await SignInPage(params({}))).toBeTruthy()
    expect(redirect).not.toHaveBeenCalled()
  })

  it("sign-up mode for a visitor who is already signed in goes to their next step", async () => {
    isSignedInFresh.mockResolvedValue(true)
    await SignInPage(params({ mode: "signup" }))
    expect(redirect).toHaveBeenCalledWith("/post-sign-in")
  })
})
