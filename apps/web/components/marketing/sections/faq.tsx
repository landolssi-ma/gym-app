import { t } from "@workspace/i18n"

import { FaqAccordion } from "../faq-accordion"
import { SectionHeading } from "../section-heading"

const ITEMS = [
  { question: t("marketing.faq1Question"), answer: t("marketing.faq1Answer") },
  { question: t("marketing.faq2Question"), answer: t("marketing.faq2Answer") },
  { question: t("marketing.faq3Question"), answer: t("marketing.faq3Answer") },
  { question: t("marketing.faq4Question"), answer: t("marketing.faq4Answer") },
  { question: t("marketing.faq5Question"), answer: t("marketing.faq5Answer") },
  { question: t("marketing.faq6Question"), answer: t("marketing.faq6Answer") },
]

export function Faq() {
  return (
    <section
      className="pt-(--section-space) [--section-swatch:var(--butter)]"
      id="faq"
    >
      <div className="mx-auto w-full max-w-reading px-(--page-gutter)">
        <SectionHeading
          centered
          compact
          eyebrow={t("marketing.faqEyebrow")}
          title={t("marketing.faqHeading")}
        />
        <div className="mt-10">
          <FaqAccordion items={ITEMS} variant="framed" />
        </div>
      </div>
    </section>
  )
}
