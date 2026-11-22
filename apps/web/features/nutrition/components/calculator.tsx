"use client"

import { useState } from "react"

import { t } from "@workspace/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { SearchIcon } from "@workspace/ui/components/icons"

import { useFoods } from "@/features/nutrition"

function calc(valuePer100g: number, weightG: number) {
  return Math.round(((valuePer100g * weightG) / 100) * 10) / 10
}

export function NutritionCalculator() {
  const [foodId, setFoodId] = useState("")
  const [query, setQuery] = useState("")
  const [weight, setWeight] = useState("100")
  const { data } = useFoods(query || undefined)
  const selectedFood = data?.foods.find((f) => f.id === foodId)
  const w = parseFloat(weight) || 0

  const result = selectedFood && w > 0
    ? {
        cal:  calc(selectedFood.caloriesPer100g, w),
        prot: calc(selectedFood.proteinPer100g, w),
        carb: calc(selectedFood.carbsPer100g, w),
        fat:  calc(selectedFood.fatPer100g, w),
      }
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("nutrition.calculatorHeading")}</CardTitle>
      </CardHeader>
      <CardContent className="max-w-sm space-y-4">
        {/* Food search */}
        <div className="space-y-1.5">
          <Label>{t("nutrition.searchPlaceholder")}</Label>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("nutrition.selectFoodPlaceholder")}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setFoodId("") }}
            />
          </div>
          {data?.foods && query && !foodId && (
            <ul className="max-h-48 overflow-auto rounded-lg border border-border bg-card text-sm shadow-sm">
              {data.foods.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-muted"
                    onClick={() => { setFoodId(f.id); setQuery(f.name) }}
                  >
                    {f.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {f.caloriesPer100g} kcal / 100 g
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Weight input */}
        <div className="space-y-1.5">
          <Label>{t("nutrition.weightLabel")}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              step="1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-28"
            />
            <span className="text-sm text-muted-foreground">g</span>
          </div>
        </div>

        {/* Result */}
        {result && selectedFood && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold">
              {selectedFood.name} — {w} g
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: t("nutrition.caloriesLabel"), value: result.cal,  unit: t("nutrition.kcalUnit") },
                { label: t("nutrition.proteinLabel"),  value: result.prot, unit: t("nutrition.gramUnit") },
                { label: t("nutrition.carbsLabel"),    value: result.carb, unit: t("nutrition.gramUnit") },
                { label: t("nutrition.fatLabel"),      value: result.fat,  unit: t("nutrition.gramUnit") },
              ].map(({ label, value, unit }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="font-heading text-xl font-bold">{value}</span>
                  <span className="text-xs text-muted-foreground">{unit}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
