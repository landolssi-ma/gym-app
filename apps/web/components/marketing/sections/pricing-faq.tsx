import { t } from "@workspace/i18n"

import { FaqAccordion } from "@/components/marketing/faq-accordion"

const ITEMS = [
  { question: t("pricing.faq1Question"), answer: t("pricing.faq1Answer") },
  { question: t("pricing.faq2Question"), answer: t("pricing.faq2Answer") },
  { question: t("pricing.faq3Question"), answer: t("pricing.faq3Answer") },
] as const

// Common billing/trial/plan-change objection handling for the pricing page -- not a
// feature-comparison table or testimonials, per the Pricing Page Composition decision's
// explicit scope limit for this phase. Reuses the same FaqAccordion primitive 01-03 built.
export function PricingFaq() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-heading text-2xl font-bold tracking-tight">{t("pricing.faqHeading")}</h2>
      <FaqAccordion items={ITEMS} />
    </div>
  )
}
