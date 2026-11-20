import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { NextRequest } from "next/server"
import { afterAll, describe, expect, it, vi } from "vitest"

import { CMS, cmsModule, fakeCms } from "../helpers/cms-fixture"

// Anything that could read a session fails the test: the proxy's cookie check, the in-process API
// (the only way a server component reads the session), the auth package and the network.
const { sessionRead } = vi.hoisted(() => ({ sessionRead: vi.fn() }))
vi.mock("@workspace/auth/proxy", () => ({ hasSessionCookie: sessionRead, isSignedIn: sessionRead }))
vi.mock("@/lib/api-server", () => ({ callApiInProcess: sessionRead, getMeResult: sessionRead }))
vi.mock("@workspace/auth", () => ({ createAuth: sessionRead }))
vi.mock("@/lib/cms", () => cmsModule(fakeCms))
vi.mock("@/lib/config", () => ({ getConfig: () => ({ APP_ORIGIN: "https://app.test" }) }))
vi.mock("next/navigation", () => ({ usePathname: () => "/" }))
vi.stubGlobal("fetch", sessionRead)
afterAll(() => vi.unstubAllGlobals())

import { proxy } from "../../proxy"
import { CONTENT_PATH_PREFIXES, STATIC_PUBLIC_PATHS } from "../../lib/public-paths"
import { renderServer } from "../helpers/render-server"

const appDir = fileURLToPath(new URL("../../app", import.meta.url))
// Every page outside the signed-in groups, the auth flows and the invite page is a marketing page.
const NOT_MARKETING = /^\/(\(app\)|\(backoffice\)|api|sign-in|reset-password|post-sign-in|team)(\/|$)/
const marketingRoutes = (readdirSync(appDir, { recursive: true }) as string[])
  .filter((f) => f === "page.tsx" || f.endsWith("/page.tsx"))
  .map((f) => "/" + f.replace(/\/?page\.tsx$/, ""))
  .filter((r) => !NOT_MARKETING.test(r))

const urlFor = (route: string) => route.replace("[slug]", CMS.articles[0]!.slug) || "/"

describe("marketing pages", () => {
  it("are all listed as public", () => {
    expect(marketingRoutes.length).toBeGreaterThan(STATIC_PUBLIC_PATHS.length)
    for (const route of marketingRoutes) {
      const url = urlFor(route)
      expect(STATIC_PUBLIC_PATHS.includes(url as never) || CONTENT_PATH_PREFIXES.some((p) => url.startsWith(p)), url).toBe(true)
    }
  })

  it.each(marketingRoutes.map(urlFor))("%s passes the proxy and renders without reading a session", async (url) => {
    sessionRead.mockClear()
    const res = proxy(new NextRequest(new Request(`https://app.test${url}`)))
    expect(res.headers.get("x-middleware-next")).toBe("1")
    const route = marketingRoutes.find((r) => urlFor(r) === url)!
    const { default: Page } = (await import(/* @vite-ignore */ `${appDir}${route}/page.tsx`)) as { default: (p: { params: Promise<{ slug: string }> }) => React.ReactNode }
    const html = await renderServer(<Page params={Promise.resolve({ slug: CMS.articles[0]!.slug })} />)
    expect(html).toContain('id="main-content"')
    expect(sessionRead).not.toHaveBeenCalled()
  })
})
