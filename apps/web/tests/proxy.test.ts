import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const hasSessionCookie = vi.fn()
vi.mock("@workspace/auth/proxy", () => ({ hasSessionCookie }))

const { proxy } = await import("../proxy")

beforeEach(() => hasSessionCookie.mockReset())
const run = (path: string) => proxy(new NextRequest(new Request(`https://app.test${path}`)))
const passes = (res: Response) => res.headers.get("x-middleware-next") === "1"

describe("proxy", () => {
  it.each(["/", "/sign-in", "/reset-password", "/pricing", "/privacy", "/terms", "/changelog", "/blog", "/help", "/contact", "/blog/any-new-slug", "/opengraph-image", "/blog/x/opengraph-image", "/api/anything", "/media/avatars/a.png", "/favicon.ico"])(
    "%s is public: no cookie check",
    (path) => {
      expect(passes(run(path))).toBe(true)
      expect(hasSessionCookie).not.toHaveBeenCalled()
    },
  )

  it("a protected path redirects signed-out visitors to sign-in with the path and query as return path", () => {
    hasSessionCookie.mockReturnValue(false)
    const res = run("/projects?tab=archived")
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get("location")!)
    expect(location.pathname + location.search).toBe("/sign-in?next=%2Fprojects%3Ftab%3Darchived")
  })

  it("checks the configured cookie prefix", () => {
    hasSessionCookie.mockReturnValue(true)
    expect(passes(run("/dashboard"))).toBe(true)
    expect(hasSessionCookie).toHaveBeenCalledWith(expect.anything(), "__Host-acme")
  })

  it("an OG image under a protected route stays protected", () => {
    hasSessionCookie.mockReturnValue(false)
    expect(run("/dashboard/opengraph-image").status).toBe(307)
  })

  it("/admin/* needs a session cookie; the API's requireAdmin decides the rest", () => {
    hasSessionCookie.mockReturnValue(false)
    expect(run("/admin").status).toBe(307)
    hasSessionCookie.mockReturnValue(true)
    expect(passes(run("/admin"))).toBe(true)
  })
})
