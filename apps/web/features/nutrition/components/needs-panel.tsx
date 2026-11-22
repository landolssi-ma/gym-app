"use client"

import Link from "next/link"

import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { RefreshCwIcon } from "@workspace/ui/components/icons"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { FeatureBoundary } from "@/components/feature-error"
import { useNutritionNeeds } from "@/features/nutrition"
import { ApiError } from "@/lib/api-fetch"

function StatTile({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{unit}</p>
    </div>
  )
}

function NeedsContent() {
  const { data, error, refetch, isLoading } = useNutritionNeeds()

  if (isLoading) return <NeedsSkeleton />
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">{t("nutrition.completeProfilePrompt")}</p>
        <Button variant="outline" size="sm" className="mx-auto" asChild>
          <Link href="/settings/profile">{t("nutrition.goToProfile")}</Link>
        </Button>
      </div>
    )
  }
  if (!data) return null

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{t("nutrition.needsEstimate")}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label={t("nutrition.bmrLabel")} value={data.bmr} unit={t("nutrition.bmrUnit")} />
        <StatTile label={t("nutrition.tdeeLabel")} value={data.tdee} unit={t("nutrition.tdeeUnit")} />
        <StatTile label={t("nutrition.caloricGoalLabel")} value={data.caloricGoal} unit={t("nutrition.caloricGoalUnit")} />
        <StatTile label={t("nutrition.proteinLabel")} value={data.proteinG} unit={t("nutrition.macroUnit")} />
        <StatTile label={t("nutrition.carbsLabel")} value={data.carbsG} unit={t("nutrition.macroUnit")} />
        <StatTile label={t("nutrition.fatLabel")} value={data.fatG} unit={t("nutrition.macroUnit")} />
      </div>
      <Button variant="outline" size="sm" onClick={() => refetch()}>
        <RefreshCwIcon className="mr-2 size-4" />
        {t("nutrition.recalculate")}
      </Button>
    </div>
  )
}

function NeedsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </div>
  )
}

export function NeedsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("nutrition.needsHeading")}</CardTitle>
        <CardDescription>{t("nutrition.needsBody")}</CardDescription>
      </CardHeader>
      <CardContent>
        <FeatureBoundary skeleton={<NeedsSkeleton />}>
          <NeedsContent />
        </FeatureBoundary>
      </CardContent>
    </Card>
  )
}
