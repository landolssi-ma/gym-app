"use client"

import type React from "react"
import Link from "next/link"

import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { ChartColumnIcon, FlameIcon, RefreshCwIcon, TargetIcon, ZapIcon } from "@workspace/ui/components/icons"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { FeatureBoundary } from "@/components/feature-error"
import { useNutritionNeeds } from "@/features/nutrition"
import { ApiError } from "@/lib/api-fetch"

const GOAL_INFO: Record<string, { name: string; desc: string }> = {
  muscle_gain:        { name: "Muscle gain",          desc: "A moderate caloric surplus to build lean muscle over time." },
  fat_loss:           { name: "Fat loss",              desc: "A moderate caloric deficit to reach your goal steadily." },
  weight_loss:        { name: "Weight loss",           desc: "A caloric deficit to progressively lower body weight." },
  maintenance:        { name: "Maintenance",           desc: "Matching your energy expenditure to stay at your current weight." },
  body_recomposition: { name: "Body recomposition",   desc: "A slight deficit to lose fat while preserving muscle mass." },
}

function macroPercent(grams: number, kcalPerG: number, total: number) {
  return Math.round((grams * kcalPerG / total) * 100)
}

function StatCol({
  Icon,
  label,
  value,
  unit,
}: {
  Icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  unit: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div
        className="flex size-9 items-center justify-center rounded-full"
        style={{ background: "color-mix(in srgb, var(--sage) 15%, var(--background))" }}
      >
        <Icon className="size-4 text-primary" />
      </div>
      <p className="max-w-24 text-xs leading-snug text-muted-foreground">{label}</p>
      <span className="font-heading text-3xl font-bold tabular-nums">{value.toLocaleString()}</span>
      <span className="text-xs text-muted-foreground">{unit}</span>
    </div>
  )
}

function MacroCard({
  emoji,
  label,
  value,
  pct,
}: {
  emoji: string
  label: string
  value: number
  pct: number
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-5 text-center">
      <span className="text-2xl">{emoji}</span>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-0.5">
        <span className="font-heading text-3xl font-bold">{value}</span>
        <span className="font-heading text-lg font-semibold"> g</span>
      </div>
      <span className="text-xs text-muted-foreground">({pct}%)</span>
    </div>
  )
}

function NeedsContent() {
  const { data, error, refetch, isLoading } = useNutritionNeeds()

  if (isLoading) return <NeedsSkeleton />
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border p-12 text-center">
        <div className="rounded-full bg-muted p-5 text-5xl">🥗</div>
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
  const goalInfo = GOAL_INFO[data.goal] ?? GOAL_INFO.maintenance!

  return (
    <div className="space-y-6">
      {/* ── Hero card ─────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex">
          {/* Left: title + subtitle + recalculate */}
          <div className="flex flex-col justify-between gap-4 p-6 md:p-8" style={{ width: "15rem", minWidth: "12rem" }}>
            <div className="space-y-2">
              <h3 className="font-heading text-lg font-bold leading-snug">
                {t("nutrition.needsHeading")}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("nutrition.needsBody")}
              </p>
            </div>
            <Button variant="outline" size="sm" className="w-fit" onClick={() => refetch()}>
              <RefreshCwIcon className="mr-2 size-4" />
              {t("nutrition.recalculate")}
            </Button>
          </div>

          {/* Divider */}
          <div className="w-px self-stretch bg-border" />

          {/* Middle: 3 stat columns */}
          <div className="flex flex-1 items-center justify-around px-4 py-8">
            <StatCol
              Icon={FlameIcon}
              label={t("nutrition.bmrLabel")}
              value={data.bmr}
              unit={t("nutrition.bmrUnit")}
            />
            <div className="h-14 w-px bg-border" />
            <StatCol
              Icon={ZapIcon}
              label={t("nutrition.tdeeLabel")}
              value={data.tdee}
              unit={t("nutrition.tdeeUnit")}
            />
            <div className="h-14 w-px bg-border" />
            <StatCol
              Icon={TargetIcon}
              label={t("nutrition.caloricGoalLabel")}
              value={data.caloricGoal}
              unit={t("nutrition.caloricGoalUnit")}
            />
          </div>

          {/* Right: decorative food image */}
          <div
            className="hidden shrink-0 md:block"
            style={{ width: "9rem", background: "color-mix(in srgb, var(--beige) 50%, var(--background))" }}
          >
            <div className="flex h-full w-full items-center justify-center text-7xl">🥗</div>
          </div>
        </div>
      </div>

      {/* ── Macros heading ─────────────────────────────────────── */}
      <div>
        <h4 className="mb-4 font-heading text-base font-semibold">
          {t("nutrition.macrosHeading")}
        </h4>

        <div className="flex flex-col gap-4 lg:flex-row">
          {/* 3 macro tiles */}
          <div className="flex flex-1 gap-4">
            <MacroCard emoji="💪" label={t("nutrition.proteinLabel")} value={data.proteinG} pct={pPct} />
            <MacroCard emoji="🌾" label={t("nutrition.carbsLabel")}   value={data.carbsG}   pct={cPct} />
            <MacroCard emoji="💧" label={t("nutrition.fatLabel")}     value={data.fatG}     pct={fPct} />
          </div>

          {/* Goal card */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 lg:w-52 lg:shrink-0">
            <div className="flex items-center gap-2">
              <div
                className="flex size-7 items-center justify-center rounded-lg"
                style={{ background: "color-mix(in srgb, var(--sage) 15%, var(--background))" }}
              >
                <ChartColumnIcon className="size-4 text-primary" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("nutrition.yourGoalHeading")}
              </span>
            </div>
            <p className="mt-2 font-heading text-xl font-bold leading-tight">{goalInfo.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{goalInfo.desc}</p>
            <TargetIcon className="absolute bottom-2 right-2 size-12 opacity-10" />
          </div>
        </div>
      </div>

      {/* ── Tip card ───────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl">💡</span>
          <div>
            <p className="text-sm font-semibold">{t("nutrition.tipHeading")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("nutrition.dailyTip")}</p>
          </div>
        </div>
        <Button size="sm" asChild className="shrink-0">
          <Link href="/settings/profile">{t("nutrition.viewMore")} →</Link>
        </Button>
      </div>
    </div>
  )
}

function NeedsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 rounded-2xl" />
      <div className="flex gap-4">
        <Skeleton className="h-32 flex-1 rounded-xl" />
        <Skeleton className="h-32 flex-1 rounded-xl" />
        <Skeleton className="h-32 flex-1 rounded-xl" />
        <Skeleton className="h-32 w-52 rounded-xl" />
      </div>
      <Skeleton className="h-16 rounded-xl" />
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
