import { t } from "@workspace/i18n"

import { MarketingCta, SectionHeading } from "../section-heading"

const STEPS = [
  {
    title: t("marketing.howItWorksStep1Title"),
    body: t("marketing.howItWorksStep1Body"),
  },
  {
    title: t("marketing.howItWorksStep2Title"),
    body: t("marketing.howItWorksStep2Body"),
  },
  {
    title: t("marketing.howItWorksStep3Title"),
    body: t("marketing.howItWorksStep3Body"),
  },
  { title: t("marketing.howStep4Title"), body: t("marketing.howStep4Body") },
]

export function HowItWorks() {
  return (
    <section
      className="pt-(--section-space) [--section-swatch:var(--sky)]"
      id="why-it-works"
    >
      <div className="mx-auto w-full max-w-marketing px-(--page-gutter)">
        <SectionHeading
          eyebrow={t("marketing.howEyebrow")}
          title={t("marketing.howItWorksHeading")}
        >
          {t("marketing.howBody")}
        </SectionHeading>
        <ol className="relative mt-10 max-w-215 before:absolute before:inset-y-10.5 before:left-6.25 before:border-l-2 before:border-dashed before:border-border before:content-['']">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="relative flex reveal-on-scroll gap-6 py-3.5 max-md:gap-4.5 nth-2:[&>span]:bg-pop nth-3:[&>span]:bg-butter nth-4:[&>span]:bg-blush"
            >
              <span
                className="inline-flex size-13 flex-none -rotate-5 items-center justify-center rounded-tile border-2 border-border-strong bg-sky font-mono text-index leading-(--leading-natural) font-bold shadow-[3px_3px_0_var(--border-strong)]"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="pt-1 text-title tracking-tight max-md:text-xl max-md:leading-normal">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-155 text-copy-lg leading-(--leading-copy) text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <MarketingCta hint={t("marketing.howCtaHint")}>
          {t("marketing.howCta")}
        </MarketingCta>
      </div>
    </section>
  )
}
