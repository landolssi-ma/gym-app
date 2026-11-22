"use client"

import { useState } from "react"

import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Trash2Icon } from "@workspace/ui/components/icons"

import { FeatureBoundary } from "@/components/feature-error"
import { useCreateMealEntry, useDeleteMealEntry, useFoods, useMealEntries } from "@/features/nutrition"

type Slot = "breakfast" | "lunch" | "dinner" | "snack_1" | "snack_2"

const SLOTS: { slot: Slot; label: string }[] = [
  { slot: "breakfast", label: t("nutrition.slotBreakfast") },
  { slot: "lunch", label: t("nutrition.slotLunch") },
  { slot: "dinner", label: t("nutrition.slotDinner") },
  { slot: "snack_1", label: t("nutrition.slotSnack1") },
  { slot: "snack_2", label: t("nutrition.slotSnack2") },
]

function calc(valuePer100g: number, weightG: number) {
  return Math.round((valuePer100g * weightG) / 100 * 10) / 10
}

function AddEntryForm({ date, slot, onDone }: { date: string; slot: Slot; onDone: () => void }) {
  const [foodId, setFoodId] = useState("")
  const [weight, setWeight] = useState("100")
  const [query, setQuery] = useState("")
  const { data: foodData } = useFoods(query || undefined)
  const create = useCreateMealEntry(date)
  const selectedFood = foodData?.foods.find((f) => f.id === foodId)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!foodId) return
    await create.mutateAsync({ foodId, date, slot, weightG: parseFloat(weight) })
    onDone()
  }

  const w = parseFloat(weight) || 0
  const preview = selectedFood
    ? { cal: calc(selectedFood.caloriesPer100g, w), prot: calc(selectedFood.proteinPer100g, w), carb: calc(selectedFood.carbsPer100g, w), fat: calc(selectedFood.fatPer100g, w) }
    : null

  return (
    <form onSubmit={submit} className="mt-2 space-y-3 rounded-lg border border-dashed border-border p-3">
      <div className="space-y-1">
        <Label className="text-xs">{t("nutrition.searchPlaceholder")}</Label>
        <Input className="h-8 text-sm" placeholder={t("nutrition.selectFoodPlaceholder")} value={query} onChange={(e) => { setQuery(e.target.value); setFoodId("") }} />
        {foodData?.foods && query && (
          <ul className="max-h-40 overflow-auto rounded border border-border bg-card text-sm">
            {foodData.foods.map((f) => (
              <li key={f.id}>
                <button type="button" className="w-full px-3 py-1.5 text-left hover:bg-muted" onClick={() => { setFoodId(f.id); setQuery(f.name) }}>
                  {f.name} <span className="text-xs text-muted-foreground">({f.caloriesPer100g} kcal/100g)</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">{t("nutrition.weightLabel")}</Label>
          <Input className="h-8 w-24 text-sm" type="number" min="0.1" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        {preview && (
          <p className="mb-1 text-xs text-muted-foreground">
            {preview.cal} kcal · {preview.prot}g P · {preview.carb}g C · {preview.fat}g F
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!foodId || create.isPending}>{t("common.save")}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>{t("common.cancel")}</Button>
      </div>
    </form>
  )
}

function SlotSection({ date, slot, label, entries }: {
  date: string
  slot: Slot
  label: string
  entries: Array<{ id: string; weightG: number; food: { caloriesPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number; name: string; preparationState: string } }>
}) {
  const [adding, setAdding] = useState(false)
  const del = useDeleteMealEntry(date)
  const slotTotal = entries.reduce((acc, e) => ({
    cal: acc.cal + calc(e.food.caloriesPer100g, e.weightG),
    prot: acc.prot + calc(e.food.proteinPer100g, e.weightG),
    carb: acc.carb + calc(e.food.carbsPer100g, e.weightG),
    fat: acc.fat + calc(e.food.fatPer100g, e.weightG),
  }), { cal: 0, prot: 0, carb: 0, fat: 0 })

  return (
    <FeatureBoundary skeleton={<Skeleton className="h-24" />}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">{label}</h4>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAdding((v) => !v)}>
            + {t("nutrition.addFoodToSlot")}
          </Button>
        </div>
        {entries.length === 0 && !adding && (
          <p className="text-xs text-muted-foreground">{t("nutrition.slotEmpty")}</p>
        )}
        {entries.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm">
            <div>
              <span className="font-medium">{e.food.name}</span>
              <span className="ml-1.5 text-xs text-muted-foreground">{e.weightG}g</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {calc(e.food.caloriesPer100g, e.weightG)} kcal · {calc(e.food.proteinPer100g, e.weightG)}g P
              </span>
              <button
                aria-label={t("nutrition.removeEntry")}
                onClick={() => del.mutate(e.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {adding && <AddEntryForm date={date} slot={slot} onDone={() => setAdding(false)} />}
        {entries.length > 0 && (
          <p className="text-right text-xs text-muted-foreground">
            {t("nutrition.slotTotal")}: {Math.round(slotTotal.cal)} kcal · {Math.round(slotTotal.prot)}g P · {Math.round(slotTotal.carb)}g C · {Math.round(slotTotal.fat)}g F
          </p>
        )}
      </div>
    </FeatureBoundary>
  )
}

function PlannerContent({ date }: { date: string }) {
  const { data, isLoading } = useMealEntries(date)
  if (isLoading) return <Skeleton className="h-64" />
  const entries = data?.entries ?? []

  const dayTotal = entries.reduce((acc, e) => ({
    cal: acc.cal + calc(e.food.caloriesPer100g, e.weightG),
    prot: acc.prot + calc(e.food.proteinPer100g, e.weightG),
    carb: acc.carb + calc(e.food.carbsPer100g, e.weightG),
    fat: acc.fat + calc(e.food.fatPer100g, e.weightG),
  }), { cal: 0, prot: 0, carb: 0, fat: 0 })

  return (
    <div className="space-y-6">
      {SLOTS.map(({ slot, label }) => (
        <SlotSection
          key={slot}
          date={date}
          slot={slot}
          label={label}
          entries={entries.filter((e) => e.slot === slot)}
        />
      ))}
      {entries.length > 0 && (
        <div className="rounded-lg bg-muted px-4 py-3 text-sm font-semibold">
          {t("nutrition.dayTotal")}: {Math.round(dayTotal.cal)} kcal · {Math.round(dayTotal.prot)}g P · {Math.round(dayTotal.carb)}g C · {Math.round(dayTotal.fat)}g F
        </div>
      )}
    </div>
  )
}

export function MealPlanner() {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{t("nutrition.mealPlannerHeading")}</CardTitle>
        <Input type="date" className="w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
      </CardHeader>
      <CardContent>
        <PlannerContent date={date} />
      </CardContent>
    </Card>
  )
}
