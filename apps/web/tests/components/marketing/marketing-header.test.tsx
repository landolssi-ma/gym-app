// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/pricing" }))

import { t } from "@workspace/i18n"

import { MarketingHeader } from "../../../components/marketing/marketing-header"
import { MobileNav } from "../../../components/marketing/mobile-nav"
import { PRIMARY_LINKS } from "../../../components/marketing/navigation-links"
import { byText, click, flush, mount } from "../../helpers/dom"

let m: ReturnType<typeof mount>
beforeEach(() => {
  m = mount()
})
afterEach(async () => {
  await m.unmount()
  vi.unstubAllGlobals()
})

const hrefs = (scope: Element | Document = m.container) => [...scope.querySelectorAll("a")].map((a) => a.getAttribute("href"))

describe("MarketingHeader", () => {
  it("offers log in and sign up to a signed-out visitor", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })))
    await m.render(<MarketingHeader />)
    await flush()
    expect(hrefs()).toEqual(expect.arrayContaining(["/sign-in", "/sign-in?mode=signup", ...PRIMARY_LINKS.map((l) => l.href)]))
    expect(hrefs()).not.toContain("/dashboard")
  })

  it("offers a link to the app instead of sign-in when signed in", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({})))
    await m.render(<MarketingHeader />)
    await flush()
    expect(byText(t("marketing.openApp"), "a")?.getAttribute("href")).toBe("/dashboard")
    expect(hrefs()).not.toContain("/sign-in")
  })

  it("marks the current page in the navigation", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })))
    await m.render(<MarketingHeader />)
    expect(m.container.querySelector('a[href="/pricing"]')?.getAttribute("data-active")).not.toBeNull()
  })
})

describe("MobileNav", () => {
  async function open(signedIn = false) {
    await m.render(<MobileNav signedIn={signedIn} />)
    await click(m.container.querySelector(`[aria-label="${t("marketing.openMenuLabel")}"]`))
    return document.querySelector('[role="dialog"]')!
  }

  it("opens a menu with every primary link and the account actions", async () => {
    const sheet = await open()
    expect(hrefs(sheet)).toEqual(expect.arrayContaining(["/sign-in", "/sign-in?mode=signup", ...PRIMARY_LINKS.map((l) => l.href)]))
    expect(sheet.querySelector(`[aria-label="${t("marketing.closeMenuLabel")}"]`)).not.toBeNull()
  })

  it("shows the app link when signed in", async () => {
    const sheet = await open(true)
    expect(hrefs(sheet)).toContain("/dashboard")
    expect(hrefs(sheet)).not.toContain("/sign-in")
  })

  it("closes after following a link", async () => {
    const sheet = await open()
    await click(sheet.querySelector('a[href="/pricing"]'))
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
})
