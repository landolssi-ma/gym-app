import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/config", () => ({ getConfig: () => ({ APP_ORIGIN: "https://app.test" }) }))
vi.mock("next/navigation", () => ({ usePathname: () => "/help" }))

import { t } from "@workspace/i18n"

import ContactPage from "../../app/contact/page"
import HelpPage from "../../app/help/page"
import { site } from "../../config/site"
import { renderServer } from "../helpers/render-server"

describe("HelpPage", async () => {
  const markup = (await renderServer(<HelpPage />)).replaceAll("&#x27;", "'")

  it("renders every category heading and body", () => {
    for (const i of [1, 2, 3, 4] as const) {
      expect(markup).toContain(t(`helpPage.category${i}Heading`))
      expect(markup).toContain(t(`helpPage.category${i}Body`))
    }
  })

  it("links the support email and the contact page inside the marketing shell", () => {
    expect(markup).toContain(`href="mailto:${site.supportEmail}"`)
    expect(markup).toContain(t("helpPage.contactPrompt"))
    expect(markup).toContain('href="/contact"')
    expect(markup).toContain('id="main-content"')
  })
})

describe("ContactPage", () => {
  it("shows the support email and links to help", async () => {
    const markup = await renderServer(<ContactPage />)
    expect(markup).toContain(`href="mailto:${site.supportEmail}"`)
    expect(markup).toContain('href="/help"')
  })
})
