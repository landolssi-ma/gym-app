import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/config", () => ({ getConfig: () => ({ APP_ORIGIN: "https://app.test" }) }))
vi.mock("next/navigation", () => ({ usePathname: () => "/" }))

import { t } from "@workspace/i18n"

import HomePage from "../../../app/page"
import { renderServer } from "../../helpers/render-server"

const markup = await renderServer(<HomePage />)
const text = markup.replace(/<[^>]*>/g, "").replaceAll("&amp;", "&")

describe("HomePage", () => {
  it("renders every section in order", () => {
    const markers = [
      t.markup("marketing.heroHeadline", { highlight: (c) => c }),
      t("marketing.stat1Label"),
      t("marketing.howItWorksHeading"),
      t("marketing.threeStepHeading"),
      t("marketing.trustGridHeading"),
      t("marketing.founderQuoteText"),
      t("marketing.faqHeading"),
      t("marketing.finalCtaHeading"),
    ]
    const indices = markers.map((marker) => text.indexOf(marker))
    for (const index of indices) expect(index).toBeGreaterThanOrEqual(0)
    for (let i = 1; i < indices.length; i++) expect(indices[i]).toBeGreaterThan(indices[i - 1]!)
  })

  it("renders inside the marketing shell", () => {
    expect(markup).toContain('id="main-content"')
    expect(markup).toContain('href="/sign-in?mode=signup"')
  })
})
