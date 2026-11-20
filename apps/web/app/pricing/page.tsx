import Link from "next/link"

import { INTERVALS, PLAN_IDS, PLANS } from "@workspace/billing"
import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"

import { PageFrame, PageIntro, SectionLabel } from "@/components/marketing/content/page-parts"
import { PricingCard, usd } from "@/components/marketing/content/pricing-card"
import { JsonLd } from "@/components/marketing/json-ld"
import { MarketingShell } from "@/components/marketing/marketing-shell"
import { PricingFaq } from "@/components/marketing/sections/pricing-faq"
import { getSeo } from "@/lib/cms"
import { publicMetadata } from "@/lib/public-metadata"

const lowest = Math.min(...PLAN_IDS.map((id) => PLANS[id].priceUsd.month))
const features = [...new Set(PLAN_IDS.flatMap((id) => PLANS[id].features))]

export const metadata = publicMetadata("/pricing", t("pricing.heading"), t("pricing.metaDescription", { price: usd(lowest) }))

export default function PricingPage() {
  const seo = getSeo()
  const rows: [string, ...string[]][] = [
    [t("pricing.compareSeats"), ...PLAN_IDS.map((id) => String(PLANS[id].limits.seats ?? t("pricing.unlimited")))],
    [t("pricing.compareProjects"), ...PLAN_IDS.map((id) => String(PLANS[id].limits.projects ?? t("pricing.unlimited")))],
    ...features.map((f): [string, ...string[]] => [t(`plans.features.${f}`), ...PLAN_IDS.map((id) => ((PLANS[id].features as readonly string[]).includes(f) ? t("pricing.included") : "—"))]),
  ]
  return (
    <MarketingShell>
      <JsonLd data={seo.buildBreadcrumbListJsonLd([{ name: t("marketing.homeCrumb"), path: "/" }, { name: t("pricing.heading"), path: "/pricing" }])} />
      <JsonLd data={seo.buildOffersJsonLd(PLAN_IDS.flatMap((id) => INTERVALS.map((interval) => ({ name: PLANS[id].name, priceUsd: PLANS[id].priceUsd[interval], interval }))))} />
      <div className="bg-background paper-dots">
        <PageFrame>
          <PageIntro eyebrow={t("pricing.eyebrow")} title={t("pricing.heading")}>
            <p>{t("pricing.intro")}</p>
          </PageIntro>
          <div className="mt-9 grid gap-4 rounded-panel border border-border bg-card p-5 sm:grid-cols-3">
            {([1, 2, 3] as const).map((i) => (
              <div key={i} className="reveal-on-scroll">
                <p className="font-mono text-caption text-brand-hover uppercase">{t(`pricing.step${i}Kicker`)}</p>
                <h2 className="mt-2 text-lg">{t(`pricing.step${i}Title`)}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t(`pricing.step${i}Body`)}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid items-stretch gap-6 md:grid-cols-3">
            {PLAN_IDS.map((plan, i) => (
              <PricingCard plan={plan} featured={i === 1} key={plan} />
            ))}
          </div>
          <section className="mt-14 reveal-on-scroll">
            <SectionLabel>{t("pricing.compareHeading")}</SectionLabel>
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full text-left text-xs sm:text-sm">
                <caption className="sr-only">{t("pricing.compareCaption")}</caption>
                <thead className="bg-forest text-forest-foreground">
                  <tr>
                    {[t("pricing.compareFeature"), ...PLAN_IDS.map((id) => PLANS[id].name)].map((h) => (
                      <th key={h} scope="col" className="px-2 py-3 font-semibold sm:px-4 sm:py-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([label, ...cells]) => (
                    <tr key={label} className="border-t border-border">
                      <th scope="row" className="px-2 py-3 font-medium sm:px-4 sm:py-4">
                        {label}
                      </th>
                      {cells.map((cell, i) => (
                        <td key={i} className="px-2 py-3 sm:px-4 sm:py-4">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="mt-12 max-w-reading reveal-on-scroll">
            <h2 className="text-2xl">{t("pricing.termsHeading")}</h2>
            <p className="mt-4 text-sm leading-(--leading-body) text-muted-foreground">{t("pricing.termsBody")}</p>
          </section>
          <div className="mt-12">
            <PricingFaq />
          </div>
          <Button variant="marketing" size="marketing" className="mt-8" asChild>
            <Link href="/sign-in?mode=signup">{t("pricing.cta")}</Link>
          </Button>
        </PageFrame>
      </div>
    </MarketingShell>
  )
}
