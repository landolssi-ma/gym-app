import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/config", () => ({ getConfig: () => ({ APP_ORIGIN: "https://app.test" }) }))
vi.mock("next/navigation", () => ({ usePathname: () => "/pricing" }))

import { INTERVALS, PLAN_IDS, PLANS } from "@workspace/billing"
import { t } from "@workspace/i18n"

import { usd } from "../../components/marketing/content/pricing-card"
import { renderServer } from "../helpers/render-server"

const render = async () => {
  const { default: PricingPage } = await import("../../app/pricing/page")
  return renderServer(<PricingPage />)
}
const jsonLd = (html: string) => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]!) as Record<string, unknown>)

describe("PricingPage", async () => {
  const markup = await render()

  it("shows every plan with its monthly and yearly price, trial length, limits and features", () => {
    for (const id of PLAN_IDS) {
      const p = PLANS[id]
      expect(markup).toContain(p.name)
      expect(markup).toContain(usd(p.priceUsd.month))
      expect(markup).toContain(t("pricing.yearlyPrice", { price: usd(p.priceUsd.year) }))
      expect(markup).toContain(t("plans.trial", { days: p.trialDays }))
    }
    expect(markup).toContain(t("plans.seats", { count: PLANS.pro.limits.seats }))
    expect(markup).toContain(t("plans.projectsUnlimited"))
    expect(markup).toContain(t("plans.features.export"))
  })

  it("leads every button to sign-up", () => {
    const hrefs = [...markup.matchAll(/<a[^>]*href="([^"]*)"[^>]*>(?:[^<]|<span[^>]*>[^<]*<\/span>)*(?:Choose|Start your free trial)/g)].map((m) => m[1])
    expect(hrefs.length).toBe(PLAN_IDS.length + 1)
    for (const href of hrefs) expect(href).toBe("/sign-in?mode=signup")
  })

  it("renders inside the marketing shell with the pricing FAQ", () => {
    expect(markup).toContain(t("marketing.logInLabel"))
    expect(markup).toContain(t("pricing.faqHeading"))
    expect(markup.match(/data-slot="accordion-item"/g)?.length).toBe(3)
  })

  it("has one offer per plan and interval at the plans.ts price", () => {
    const product = jsonLd(markup).find((b) => b["@type"] === "Product") as { offers: { name: string; price: string; priceSpecification: { unitCode: string } }[] }
    expect(product.offers).toHaveLength(PLAN_IDS.length * INTERVALS.length)
    for (const id of PLAN_IDS)
      for (const interval of INTERVALS)
        expect(product.offers).toContainEqual(
          expect.objectContaining({ name: PLANS[id].name, price: PLANS[id].priceUsd[interval].toFixed(2), priceSpecification: expect.objectContaining({ unitCode: interval === "month" ? "MON" : "ANN" }) }),
        )
  })
})

describe("a price change in plans.ts", () => {
  it("shows on the page with no other edit", async () => {
    vi.resetModules()
    vi.doMock("@workspace/billing", async (orig) => {
      const m = await orig<typeof import("@workspace/billing")>()
      return { ...m, PLANS: { ...m.PLANS, pro: { ...m.PLANS.pro, priceUsd: { month: 81, year: 777 } } } }
    })
    const markup = await render()
    expect(markup).toContain(t("pricing.yearlyPrice", { price: "$777" }))
    expect(markup).toContain("$81")
    expect(markup).not.toContain(usd(PLANS.pro.priceUsd.year))
    expect(JSON.stringify(jsonLd(markup))).toContain('"price":"777.00"')
  })
})
