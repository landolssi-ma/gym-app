import type { Metadata } from "next"

import { t } from "@workspace/i18n"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { FeatureBoundary } from "@/components/feature-error"
import { Wordmark } from "@/components/wordmark"

import { PlanCards } from "./plan-cards"

export const metadata: Metadata = { title: t("plans.title") }

export default function PlansPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-4 py-12 dotted-grid">
      <a href="/dashboard" className="self-center" aria-label={t("common.homeLabel")}>
        <Wordmark size="header" />
      </a>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{t("plans.title")}</h1>
        <p className="text-muted-foreground">{t("plans.subtitle")}</p>
      </div>
      <FeatureBoundary skeleton={<Skeleton className="h-96 w-full" />}>
        <PlanCards />
      </FeatureBoundary>
    </main>
  )
}
