"use client"

import { useState } from "react"

import { t } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { SearchIcon, Trash2Icon } from "@workspace/ui/components/icons"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { FeatureBoundary } from "@/components/feature-error"
import { useCreateFood, useDeleteFood, useFoods } from "@/features/nutrition"

type PrepState = "raw" | "cooked" | "drained"

function prepLabel(state: PrepState) {
  return state === "raw" ? t("nutrition.preparationRaw") : state === "cooked" ? t("nutrition.preparationCooked") : t("nutrition.preparationDrained")
}

function AddFoodForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("")
  const [prep, setPrep] = useState<PrepState>("raw")
  const [cal, setCal] = useState("")
  const [prot, setProt] = useState("")
  const [carb, setCarb] = useState("")
  const [fat, setFat] = useState("")
  const create = useCreateFood()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await create.mutateAsync({
      name,
      preparationState: prep,
      caloriesPer100g: parseFloat(cal),
      proteinPer100g: parseFloat(prot),
      carbsPer100g: parseFloat(carb),
      fatPer100g: parseFloat(fat),
    })
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label>{t("nutrition.foodNameLabel")}</Label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>{t("nutrition.preparationStateLabel")}</Label>
          <Select value={prep} onValueChange={(v) => setPrep(v as PrepState)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="raw">{t("nutrition.preparationRaw")}</SelectItem>
              <SelectItem value="cooked">{t("nutrition.preparationCooked")}</SelectItem>
              <SelectItem value="drained">{t("nutrition.preparationDrained")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {[
          { label: t("nutrition.caloriesLabel"), val: cal, set: setCal },
          { label: t("nutrition.proteinFieldLabel"), val: prot, set: setProt },
          { label: t("nutrition.carbsFieldLabel"), val: carb, set: setCarb },
          { label: t("nutrition.fatFieldLabel"), val: fat, set: setFat },
        ].map(({ label, val, set }) => (
          <div key={label} className="space-y-1">
            <Label>{label}</Label>
            <Input required type="number" min="0" step="0.1" value={val} onChange={(e) => set(e.target.value)} />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={create.isPending}>{t("nutrition.saveFood")}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>{t("common.cancel")}</Button>
      </div>
    </form>
  )
}

function FoodList({ query }: { query: string }) {
  const { data } = useFoods(query || undefined)
  const del = useDeleteFood()

  if (!data?.foods.length) return <p className="text-sm text-muted-foreground">{t("nutrition.foodsEmpty")}</p>

  return (
    <ul className="space-y-2">
      {data.foods.map((food) => (
        <li key={food.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{food.name}</span>
              <span className="text-xs text-muted-foreground">({prepLabel(food.preparationState as PrepState)})</span>
              {!food.userId && <Badge variant="secondary" className="text-xs">{t("nutrition.systemFoodBadge")}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              {food.caloriesPer100g} kcal · {food.proteinPer100g}g P · {food.carbsPer100g}g C · {food.fatPer100g}g F <span className="ml-1">/ {t("nutrition.perHundredG")}</span>
            </p>
          </div>
          {food.userId && (
            <ConfirmDeleteDialog
              trigger={t("nutrition.deleteFood")}
              title={t("nutrition.deleteFoodTitle")}
              body={t("nutrition.deleteFoodBody")}
              confirmLabel={t("nutrition.deleteFood")}
              value={food.name}
              disabled={del.isPending}
              onConfirm={() => del.mutateAsync(food.id)}
            />
          )}
        </li>
      ))}
    </ul>
  )
}

export function FoodLibrary() {
  const [query, setQuery] = useState("")
  const [adding, setAdding] = useState(false)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{t("nutrition.foodsHeading")}</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
          {t("nutrition.addCustomFood")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && <AddFoodForm onDone={() => setAdding(false)} />}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("nutrition.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <FeatureBoundary skeleton={<Skeleton className="h-32" />}>
          <FoodList query={query} />
        </FeatureBoundary>
      </CardContent>
    </Card>
  )
}
