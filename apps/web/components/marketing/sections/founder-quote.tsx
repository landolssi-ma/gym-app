import { Button } from "@workspace/ui/components/button"
import Link from "next/link"

import { t } from "@workspace/i18n"

const METRICS = [
  {
    value: t("marketing.founderMetric1Value"),
    label: t("marketing.founderMetric1Label"),
  },
  {
    value: t("marketing.founderMetric2Value"),
    label: t("marketing.founderMetric2Label"),
  },
  {
    value: t("marketing.founderMetric3Value"),
    label: t("marketing.founderMetric3Label"),
  },
  {
    value: t("marketing.founderMetric4Value"),
    label: t("marketing.founderMetric4Label"),
  },
]

export function FounderQuote() {
  return (
    <section
      className="mt-18 max-content:mt-15 [&_blockquote]:mt-4 [&_blockquote]:text-2xl [&_blockquote]:leading-(--leading-quote) [&_blockquote]:font-semibold [&_blockquote]:tracking-(--tracking-quote) [&_blockquote]:text-balance max-md:[&_blockquote]:text-xl max-md:[&_blockquote]:leading-(--leading-quote) [&_figcaption]:mt-4 [&_figcaption]:font-mono [&_figcaption]:text-xs [&_figcaption]:leading-(--leading-source) [&_figcaption]:font-normal [&_figcaption]:text-pop"
      aria-label={t("marketing.founderEyebrow")}
    >
      <div className="mx-auto w-full max-w-marketing px-(--page-gutter)">
        <div className="grid reveal-on-scroll grid-cols-2 items-center gap-9 rounded-band bg-forest px-11 py-10 text-forest-foreground max-content:grid-cols-1 max-md:px-6 max-md:py-7.5">
          <figure>
            <p className="font-mono text-tiny leading-(--leading-body) font-semibold tracking-widest text-butter uppercase">
              {t("marketing.founderEyebrow")}
            </p>
            <blockquote>“{t("marketing.founderQuoteText")}”</blockquote>
            <figcaption>— {t("marketing.founderQuoteName")}</figcaption>
            <Button
              variant="marketing"
              size="marketing"
              className="mt-5.5 bg-butter px-6 py-3.25 text-copy leading-(--leading-natural) text-forest hover:bg-butter-soft"
              asChild
            >
              <Link href="/sign-in?mode=signup">{t("marketing.founderCta")} →</Link>
            </Button>
          </figure>
          <div className="grid grid-cols-(--grid-pair) gap-3.5">
            {METRICS.map((metric) => (
              <div
                className="rounded-xl border border-card/16 bg-card/8 p-4 [&_p]:mt-1 [&_p]:text-xs [&_p]:leading-(--leading-caption) [&_p]:text-pop [&_strong]:text-3xl [&_strong]:leading-normal [&_strong]:tracking-(--tracking-stat) [&_strong]:text-butter"
                key={metric.label}
              >
                <strong>{metric.value}</strong>
                <p>{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
