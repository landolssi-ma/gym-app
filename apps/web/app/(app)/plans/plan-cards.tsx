"use client"

import { useState } from "react"

import { PLAN_IDS, PLANS, type Interval, type PlanId } from "@workspace/billing"
import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardFooter, CardHeader } from "@workspace/ui/components/card"
import { useToast } from "@workspace/ui/hooks/use-toast"

import { useIsImpersonating, useMe } from "@/features/auth"
import { useBillingActions } from "@/features/billing"
import { ApiError } from "@/lib/api-fetch"
import { errorMessage } from "@/lib/errors"

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

// One card per plan in plans.ts, the same data the pricing page and checkout use.
export function PlanCards() {
  const { data: me } = useMe()
  const impersonating = useIsImpersonating()
  const { checkout } = useBillingActions()
  const { toast } = useToast()
  const [interval, setInterval] = useState<Interval>("month")
  const isOwner = me.orgRole === "owner"

  async function choose(plan: PlanId) {
    try {
      window.location.assign((await checkout.mutateAsync({ plan, interval })).url)
    } catch (err) {
      toast({ title: errorMessage(err instanceof ApiError ? err.message : undefined), variant: "destructive" })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div role="radiogroup" aria-label={t("billing.intervalLabel")} className="flex gap-2 self-center rounded-full border border-border bg-card p-1">
        {(["month", "year"] as const).map((i) => (
          <Button key={i} role="radio" aria-checked={interval === i} variant={interval === i ? "default" : "ghost"} size="sm" className="rounded-full" onClick={() => setInterval(i)}>
            {t(i === "month" ? "plans.monthly" : "plans.yearly")}
            {i === "year" && <span className="ml-1 text-xs opacity-80">{t("plans.yearlySave")}</span>}
          </Button>
        ))}
      </div>
      {!isOwner && <p className="text-center text-sm text-muted-foreground">{t("plans.askOwner")}</p>}
      {me.live && (
        <p className="text-center text-sm text-muted-foreground">
          {t("plans.alreadySubscribed")}{" "}
          <a href="/billing" className="underline underline-offset-2">
            {t("plans.manageBilling")}
          </a>
        </p>
      )}
      <div className="grid gap-5 md:grid-cols-3">
        {PLAN_IDS.map((id) => {
          const plan = PLANS[id]
          return (
            <Card key={id} className="rounded-panel border-border-strong shadow-hard-sm">
              <CardHeader className="gap-2">
                <h2 className="font-heading text-xl font-bold">{plan.name}</h2>
                <p className="font-heading text-3xl font-bold tabular-nums">
                  {usd(plan.priceUsd[interval])}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">{t(interval === "month" ? "plans.perMonth" : "plans.perYear")}</span>
                </p>
                {me.trialEligible && plan.trialDays > 0 && <p className="font-mono text-xs font-semibold">{t("plans.trial", { days: plan.trialDays })}</p>}
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-1 text-sm">
                  <li>{plan.limits.seats === null ? t("plans.seatsUnlimited") : t("plans.seats", { count: plan.limits.seats })}</li>
                  <li>{plan.limits.projects === null ? t("plans.projectsUnlimited") : t("plans.projects", { count: plan.limits.projects })}</li>
                  {plan.features.map((f) => (
                    <li key={f}>{t(`plans.features.${f}`)}</li>
                  ))}
                </ul>
              </CardContent>
              {isOwner && !me.live && (
                <CardFooter>
                  <Button className="w-full" disabled={impersonating || checkout.isPending} onClick={() => choose(id)}>
                    {t(me.trialEligible ? "plans.startTrial" : "plans.subscribe")}
                  </Button>
                </CardFooter>
              )}
            </Card>
          )
        })}
      </div>
      {!me.trialEligible && !me.live && <p className="text-center text-sm text-muted-foreground">{t("plans.noTrialNote")}</p>}
    </div>
  )
}
