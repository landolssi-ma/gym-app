import { t } from "@workspace/i18n"

import { SectionHeading } from "../section-heading"

const STATS = [
  {
    value: t("marketing.stat1Value"),
    label: t("marketing.stat1Label"),
    unit: t("marketing.stat1Unit"),
    body: t("marketing.stat1Body"),
    source: t("marketing.stat1Source"),
    href: "/pricing",
  },
  {
    value: t("marketing.stat2Value"),
    label: t("marketing.stat2Label"),
    unit: t("marketing.stat2Unit"),
    body: t("marketing.stat2Body"),
    source: t("marketing.stat2Source"),
    href: "/blog",
  },
  {
    value: t("marketing.stat3Value"),
    label: t("marketing.stat3Label"),
    unit: t("marketing.stat3Unit"),
    body: t("marketing.stat3Body"),
    source: t("marketing.stat3Source"),
    href: "/help",
  },
]

export function StatsProof() {
  return (
    <section
      className="pt-(--section-space) pt-22 [--section-swatch:var(--blush)] max-content:pt-15"
      id="research"
    >
      <div className="mx-auto w-full max-w-marketing px-(--page-gutter)">
        <SectionHeading
          eyebrow={t("marketing.researchEyebrow")}
          title={t("marketing.researchHeading")}
        >
          {t("marketing.researchBody")}
        </SectionHeading>
        <div className="mt-12 grid grid-cols-3 gap-(--grid-gap) max-content:grid-cols-1">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="reveal-on-scroll rounded-panel border-2 border-border-strong bg-card p-6.5 shadow-[6px_6px_0_var(--swatch,var(--border))] nth-2:[--swatch:var(--pop)] nth-3:[--swatch:var(--butter)] max-compact:p-6"
            >
              <p className="font-mono text-xs leading-(--leading-copy) font-semibold tracking-(--tracking-label) uppercase">
                {stat.label}
              </p>
              <div className="mt-5.5 flex items-baseline gap-2.5 [&_span]:text-sm [&_span]:leading-normal [&_span]:text-muted-foreground [&_strong]:text-stat [&_strong]:tracking-(--tracking-stat) [&_strong]:text-brand-hover">
                <strong>{stat.value}</strong>
                <span>{stat.unit}</span>
              </div>
              <p className="mt-2.5 text-sm leading-normal text-muted-foreground">
                {stat.body}
              </p>
              <a
                className="mt-3.5 block font-mono text-tiny leading-(--leading-body) font-normal text-muted-foreground"
                href={stat.href}
              >
                {stat.source} ↗
              </a>
            </div>
          ))}
        </div>
        <p className="mt-4.5 font-mono text-caption leading-(--leading-body) font-normal text-muted-foreground">
          {t("marketing.researchFoot")}
        </p>
      </div>
    </section>
  )
}
