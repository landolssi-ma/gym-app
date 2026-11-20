import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/config", () => ({ getConfig: () => ({ APP_ORIGIN: "https://app.test" }) }))
vi.mock("next/navigation", () => ({ usePathname: () => "/" }))

import { t } from "@workspace/i18n"

import { MarketingShell } from "../../../components/marketing/marketing-shell"
import { FOOTER_COLUMNS, PRIMARY_LINKS } from "../../../components/marketing/navigation-links"
import { site } from "../../../config/site"
import { renderServer } from "../../helpers/render-server"

const html = await renderServer(
  <MarketingShell>
    <p>page body</p>
  </MarketingShell>,
)

describe("MarketingShell", () => {
  it("wraps the page in the header, main landmark and footer", () => {
    expect(html).toContain(site.name)
    expect(html).toContain('id="main-content"')
    expect(html).toContain("page body")
    expect(html).toContain(t("marketing.skipToContent"))
  })

  it("links every primary page and offers log in and sign up to visitors", () => {
    for (const { href } of PRIMARY_LINKS) expect(html).toContain(`href="${href}"`)
    expect(html).toContain('href="/sign-in"')
    expect(html).toContain('href="/sign-in?mode=signup"')
  })

  it("renders every footer link, the legal pages and the support email", () => {
    for (const { links } of FOOTER_COLUMNS) for (const { href } of links) expect(html).toContain(`href="${href}"`)
    for (const href of ["/terms", "/privacy"]) expect(html).toContain(`href="${href}"`)
    expect(html).toContain(`href="mailto:${site.supportEmail}"`)
  })

  it("carries organization and website structured data on the app origin", () => {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]!) as { "@type": string; url: string })
    expect(blocks.map((b) => b["@type"])).toEqual(["Organization", "WebSite"])
    for (const b of blocks) expect(b.url).toBe("https://app.test/")
  })
})
