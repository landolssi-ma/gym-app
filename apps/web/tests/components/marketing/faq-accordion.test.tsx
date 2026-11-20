import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { t } from "@workspace/i18n"

import { FaqAccordion } from "../../../components/marketing/faq-accordion"
import { Faq } from "../../../components/marketing/sections/faq"
import { PricingFaq } from "../../../components/marketing/sections/pricing-faq"

describe("FaqAccordion", () => {
  const items = [
    { question: "Question one?", answer: "Answer one." },
    { question: "Question two?", answer: "Answer two." },
  ]
  const markup = renderToStaticMarkup(<FaqAccordion items={items} />)

  it("renders an accordion item per item", () => {
    expect(markup.match(/data-slot="accordion-item"/g)?.length).toBe(2)
  })

  it("renders every question and answer, readable without opening the disclosure", () => {
    for (const item of items) {
      expect(markup).toContain(item.question)
      expect(markup).toContain(item.answer)
    }
  })
})

describe("Faq", () => {
  it("renders the landing FAQ heading and items through FaqAccordion", () => {
    const markup = renderToStaticMarkup(<Faq />)
    expect(markup).toContain(t("marketing.faqHeading"))
    expect(markup).toContain(t("marketing.faq1Question"))
    expect(markup).toContain(t("marketing.faq1Answer"))
    expect(markup.match(/data-slot="accordion-item"/g)?.length).toBe(6)
  })

  it("renders the pricing FAQ", () => {
    const markup = renderToStaticMarkup(<PricingFaq />)
    expect(markup).toContain(t("pricing.faqHeading"))
    expect(markup.match(/data-slot="accordion-item"/g)?.length).toBe(3)
  })
})
