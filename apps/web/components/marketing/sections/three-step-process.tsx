import { t } from "@workspace/i18n"

import { MarketingCta, SectionHeading } from "../section-heading"

const STEPS = [
  {
    title: t("marketing.threeStepStep1Title"),
    body: t("marketing.threeStepStep1Body"),
    kicker: t("marketing.process1Kicker"),
  },
  {
    title: t("marketing.threeStepStep2Title"),
    body: t("marketing.threeStepStep2Body"),
    kicker: t("marketing.process2Kicker"),
  },
  {
    title: t("marketing.threeStepStep3Title"),
    body: t("marketing.threeStepStep3Body"),
    kicker: t("marketing.process3Kicker"),
  },
]

export function ThreeStepProcess() {
  return (
    <section className="pt-(--section-space)" id="how-it-works">
      <div className="mx-auto w-full max-w-marketing px-(--page-gutter)">
        <SectionHeading
          eyebrow={t("marketing.processEyebrow")}
          title={t("marketing.threeStepHeading")}
        >
          {t("marketing.processBody")}
        </SectionHeading>
        <ol className="mt-13 grid grid-cols-3 gap-(--grid-gap) max-content:grid-cols-1 max-content:gap-8">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="relative reveal-on-scroll rounded-panel border-2 border-border-strong bg-card p-6.5 px-6 py-7 shadow-[6px_6px_0_var(--swatch,var(--border))] [--swatch:var(--sky)] nth-2:[--swatch:var(--pop)] nth-3:[--swatch:var(--butter)] max-compact:p-6 [&>span]:absolute [&>span]:-top-4 [&>span]:left-5.5 [&>span]:size-9.5 [&>span]:rounded-badge [&>span]:bg-(--swatch) [&>span]:text-subtitle [&>span]:shadow-none"
            >
              <span
                className="inline-flex size-13 flex-none -rotate-5 items-center justify-center rounded-tile border-2 border-border-strong bg-sky font-mono text-index leading-(--leading-natural) font-bold shadow-[3px_3px_0_var(--border-strong)]"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="mt-2 font-mono text-caption leading-(--leading-natural) font-medium tracking-widest text-muted-foreground uppercase">
                {step.kicker}
              </div>
              <h3 className="mt-1.5 text-title-sm tracking-(--tracking-title)">
                {step.title}
              </h3>
              <p className="mt-2.5 text-copy leading-(--leading-copy) text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
        <MarketingCta>{t("marketing.heroCta")}</MarketingCta>
      </div>
    </section>
  )
}
