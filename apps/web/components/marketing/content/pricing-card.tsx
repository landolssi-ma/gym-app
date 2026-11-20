import Link from "next/link"

import { PLANS, type PlanId } from "@workspace/billing"
import { t } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

// Everything on the card comes from plans.ts; only the one-line description is copy.
export function PricingCard({ plan, featured = false }: { plan: PlanId; featured?: boolean }) {
  const p = PLANS[plan]
  return (
    <article className={cn("flex reveal-on-scroll flex-col rounded-panel border-(length:--border-width-fine) border-border-strong bg-card p-6", featured && "bg-forest text-forest-foreground shadow-brand-lg")}>
      <div className="flex min-h-7 items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{p.name}</h2>
        {featured && <Badge variant="pop">{t("pricing.mostPopular")}</Badge>}
      </div>
      <p className={cn("mt-3 min-h-15 text-sm leading-(--leading-body) text-muted-foreground", featured && "text-forest-foreground/75")}>{t(`pricing.planDescription.${plan}`)}</p>
      <div className="mt-5 flex items-baseline gap-2">
        <strong className="text-5xl leading-none tracking-(--tracking-heading)">{usd(p.priceUsd.month)}</strong>
        <span className="text-sm">{t("plans.perMonth")}</span>
      </div>
      <p className={cn("mt-3 text-xs text-muted-foreground", featured && "text-forest-foreground/75")}>
        {t("pricing.yearlyPrice", { price: usd(p.priceUsd.year) })} · {t("plans.trial", { days: p.trialDays })}
      </p>
      <ul className="mt-6 mb-7 space-y-3 text-sm leading-(--leading-copy)">
        <li className="font-semibold">{p.limits.seats === null ? t("plans.seatsUnlimited") : t("plans.seats", { count: p.limits.seats })}</li>
        <li className="font-semibold">{p.limits.projects === null ? t("plans.projectsUnlimited") : t("plans.projects", { count: p.limits.projects })}</li>
        {p.features.map((f) => (
          <li key={f}>{t(`plans.features.${f}`)}</li>
        ))}
      </ul>
      <Button variant="marketing" size="marketing" className={cn("mt-auto w-full px-4 pt-3.75 pb-3.75", featured && "bg-butter text-forest hover:bg-butter-soft")} asChild>
        <Link href="/sign-in?mode=signup">{t("pricing.choose", { plan: p.name })} →</Link>
      </Button>
      <p className={cn("mt-4 text-center text-xs text-muted-foreground", featured && "text-forest-foreground/75")}>{t("pricing.cardNote")}</p>
    </article>
  )
}
