"use client"

import type React from "react"
import Link from "next/link"

import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { FlameIcon, LeafIcon, RefreshCwIcon, TargetIcon, ZapIcon } from "@workspace/ui/components/icons"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { FeatureBoundary } from "@/components/feature-error"
import { useNutritionNeeds } from "@/features/nutrition"
import { ApiError } from "@/lib/api-fetch"

function macroPercent(grams: number, kcalPerG: number, total: number) {
  return Math.round((grams * kcalPerG) / total * 100)
}

function StatChip({ Icon, label, value, unit }: { Icon: React.ComponentType<{ className?: string }>; label: string; value: number; unit: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <span className="font-heading text-3xl font-bold tabular-nums">{value.toLocaleString()}</span>
      <span className="text-xs text-muted-foreground">{unit}</span>
    </div>
  )
}

function MacroTile({ label, value, pct, colorStyle }: { label: string; value: number; pct: number; colorStyle: React.CSSProperties }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl p-4" style={colorStyle}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="font-heading text-2xl font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">{t("nutrition.macroUnit")}</span>
      </div>
      <p className="text-xs text-muted-foreground">({pct}% {t("nutrition.ofCalories")})</p>
    </div>
  )
}

function NeedsContent() {
  const { data, error, refetch, isLoading } = useNutritionNeeds()

  if (isLoading) return <NeedsSkeleton />
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
        <div className="rounded-full bg-muted p-4 text-4xl">🥗</div>
        <p className="text-sm text-muted-foreground">{t("nutrition.completeProfilePrompt")}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/settings/profile">{t("nutrition.goToProfile")}</Link>
        </Button>
      </div>
    )
  }
  if (!data) return null

  const pPct = macroPercent(data.proteinG, 4, data.caloricGoal)
  const cPct = macroPercent(data.carbsG, 4, data.caloricGoal)
  const fPct = macroPercent(data.fatG, 9, data.caloricGoal)

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex gap-6">
          <div className="flex-1 space-y-6">
            <div>
              <h3 className="font-heading text-xl font-bold">{t("nutrition.needsHeading")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t("nutrition.needsBody")}</p>
            </div>
            <div className="flex flex-wrap gap-8 sm:gap-12">
              <StatChip Icon={FlameIcon} label={t("nutrition.bmrLabel")} value={data.bmr} unit={t("nutrition.bmrUnit")} />
              <StatChip Icon={ZapIcon} label={t("nutrition.tdeeLabel")} value={data.tdee} unit={t("nutrition.tdeeUnit")} />
              <StatChip Icon={TargetIcon} label={t("nutrition.caloricGoalLabel")} value={data.caloricGoal} unit={t("nutrition.caloricGoalUnit")} />
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCwIcon className="mr-2 size-4" />
              {t("nutrition.recalculate")}
            </Button>
          </div>
          {/* Decorative food element */}
          <div
            className="hidden shrink-0 items-center justify-center rounded-2xl text-6xl md:flex"
            style={{ width: "9rem", height: "9rem", background: "color-mix(in srgb, var(--sage) 12%, var(--background))" }}
          >
            🥗
          </div>
        </div>
      </div>

      {/* Macros + goal */}
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("nutrition.macrosHeading")}
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <MacroTile
              label={t("nutrition.proteinLabel")}
              value={data.proteinG}
              pct={pPct}
              colorStyle={{ background: "color-mix(in srgb, var(--sage) 15%, var(--background))" }}
            />
            <MacroTile
              label={t("nutrition.carbsLabel")}
              value={data.carbsG}
              pct={cPct}
              colorStyle={{ background: "color-mix(in srgb, var(--sky) 20%, var(--background))" }}
            />
            <MacroTile
              label={t("nutrition.fatLabel")}
              value={data.fatG}
              pct={fPct}
              colorStyle={{ background: "color-mix(in srgb, var(--butter) 30%, var(--background))" }}
            />
          </div>
        </div>

        {/* Goal card */}
        <div className="space-y-3 lg:w-44 lg:shrink-0">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("nutrition.yourGoalHeading")}
          </h4>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div
              className="flex size-10 items-center justify-center rounded-xl"
              style={{ background: "color-mix(in srgb, var(--sage) 15%, var(--background))" }}
            >
              <TargetIcon className="size-5 text-primary" />
            </div>
            <div>
              <span className="font-heading text-2xl font-bold">{data.caloricGoal.toLocaleString()}</span>
              <p className="text-xs text-muted-foreground">{t("nutrition.caloricGoalUnit")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3"
        style={{ background: "color-mix(in srgb, var(--sage) 8%, var(--background))" }}
      >
        <LeafIcon className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">{t("nutrition.dailyTip")}</p>
      </div>
    </div>
  )
}

function NeedsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-44 rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    </div>
  )
}

export function NeedsPanel() {
  return (
    <FeatureBoundary skeleton={<NeedsSkeleton />}>
      <NeedsContent />
    </FeatureBoundary>
  )
}
