import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { t } from "@workspace/i18n"

import { FinalCta } from "../../../components/marketing/sections/final-cta"
import { FounderQuote } from "../../../components/marketing/sections/founder-quote"
import { Hero } from "../../../components/marketing/sections/hero"
import { HowItWorks } from "../../../components/marketing/sections/how-it-works"
import { StatsProof } from "../../../components/marketing/sections/stats-proof"
import { ThreeStepProcess } from "../../../components/marketing/sections/three-step-process"
import { TrustGrid } from "../../../components/marketing/sections/trust-grid"

const text = (html: string) => html.replace(/<[^>]*>/g, "").replaceAll("&amp;", "&")

describe("Hero", () => {
  const markup = renderToStaticMarkup(<Hero />)

  it("renders the headline and ends in a sign-up call to action", () => {
    expect(text(markup)).toContain(text(t.markup("marketing.heroHeadline", { highlight: (c) => c })))
    expect(markup).toContain(`href="/sign-in?mode=signup">${t("marketing.heroCta")}`)
  })

  it("has no product URL form and no images to supply", () => {
    expect(markup).not.toContain("<form")
    expect(markup).not.toContain("<img")
  })
})

describe("StatsProof", () => {
  const markup = renderToStaticMarkup(<StatsProof />)

  it("renders every stat value and label, and the sources note", () => {
    for (const i of [1, 2, 3] as const) {
      expect(markup).toContain(t(`marketing.stat${i}Value`))
      expect(markup).toContain(t(`marketing.stat${i}Label`))
    }
    expect(markup).toContain(t("marketing.researchFoot"))
  })
})

describe("HowItWorks", () => {
  const markup = renderToStaticMarkup(<HowItWorks />)

  it("renders the heading and every step", () => {
    expect(markup).toContain(t("marketing.howItWorksHeading"))
    for (const i of [1, 2, 3] as const) expect(markup).toContain(t(`marketing.howItWorksStep${i}Title`))
    expect(markup).toContain(t("marketing.howStep4Title"))
  })
})

describe("ThreeStepProcess", () => {
  const markup = renderToStaticMarkup(<ThreeStepProcess />)

  it("renders every step under the #how-it-works anchor the nav links to", () => {
    expect(markup).toContain('id="how-it-works"')
    for (const i of [1, 2, 3] as const) expect(markup).toContain(t(`marketing.threeStepStep${i}Title`))
  })
})

describe("TrustGrid", () => {
  const markup = renderToStaticMarkup(<TrustGrid />)

  it("renders the heading and all items", () => {
    expect(markup).toContain(t("marketing.trustGridHeading"))
    for (const i of [1, 2, 3, 4] as const) expect(markup).toContain(t(`marketing.trustGrid${i}Title`))
  })
})

describe("FounderQuote", () => {
  const markup = renderToStaticMarkup(<FounderQuote />)

  it("renders the quote with its attribution and no photo", () => {
    expect(markup).toContain(t("marketing.founderQuoteText"))
    expect(markup).toContain(t("marketing.founderQuoteName"))
    expect(markup).toContain("<blockquote")
    expect(markup).not.toContain("<img")
  })
})

describe("calls to action", () => {
  it("lead to sign-up", () => {
    for (const node of [<FinalCta key="f" />, <FounderQuote key="q" />, <HowItWorks key="h" />, <TrustGrid key="t" />])
      expect(renderToStaticMarkup(node)).toContain('href="/sign-in?mode=signup"')
  })
})
