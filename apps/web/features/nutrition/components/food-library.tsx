"use client"

import { useState } from "react"

import { t } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { PlusIcon, SearchIcon, Trash2Icon } from "@workspace/ui/components/icons"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { FeatureBoundary } from "@/components/feature-error"
import { useCreateFood, useDeleteFood, useFoods } from "@/features/nutrition"

type PrepState = "raw" | "cooked" | "drained"

function prepLabel(state: PrepState) {
  return state === "raw"
    ? t("nutrition.preparationRaw")
    : state === "cooked"
      ? t("nutrition.preparationCooked")
      : t("nutrition.preparationDrained")
}

function AddFoodForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("")
  const [prep, setPrep] = useState<PrepState>("raw")
  const [cal, setCal]   = useState("")
  const [prot, setProt] = useState("")
  const [carb, setCarb] = useState("")
  const [fat, setFat]   = useState("")
  const create = useCreateFood()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await create.mutateAsync({
      name,
      preparationState: prep,
      caloriesPer100g: parseFloat(cal),
      proteinPer100g:  parseFloat(prot),
      carbsPer100g:    parseFloat(carb),
      fatPer100g:      parseFloat(fat),
    })
    onDone()
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-border bg-muted/40 p-5 space-y-4">
      <p className="text-sm font-semibold">{t("nutrition.addCustomFood")}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">{t("nutrition.foodNameLabel")}</Label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">{t("nutrition.preparationStateLabel")}</Label>
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
          { label: t("nutrition.caloriesLabel"), val: cal,  set: setCal  },
          { label: t("nutrition.proteinFieldLabel"), val: prot, set: setProt },
          { label: t("nutrition.carbsFieldLabel"), val: carb, set: setCarb },
          { label: t("nutrition.fatFieldLabel"), val: fat,  set: setFat  },
        ].map(({ label, val, set }) => (
          <div key={label} className="space-y-1.5">
            <Label className="text-xs">{label}</Label>
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

  if (!data?.foods.length) {
    return (
      <div className="rounded-xl border border-dashed border-border py-10 text-center">
        <p className="text-sm text-muted-foreground">{t("nutrition.foodsEmpty")}</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {data.foods.map((food) => (
        <li
          key={food.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">{food.name}</span>
              <span className="text-xs text-muted-foreground">· {prepLabel(food.preparationState as PrepState)}</span>
              {!food.userId && (
                <Badge variant="secondary" className="text-xs">{t("nutrition.systemFoodBadge")}</Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {food.caloriesPer100g} kcal&nbsp;·&nbsp;
              {food.proteinPer100g}g P&nbsp;·&nbsp;
              {food.carbsPer100g}g C&nbsp;·&nbsp;
              {food.fatPer100g}g F
              <span className="ml-1">/ {t("nutrition.perHundredG")}</span>
            </p>
          </div>
          {food.userId && (
            <ConfirmDeleteDialog
              trigger={<Trash2Icon className="size-4" />}
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
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{t("nutrition.foodsHeading")}</CardTitle>
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          <PlusIcon className="mr-2 size-4" />
          {t("nutrition.addCustomFood")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && <AddFoodForm onDone={() => setAdding(false)} />}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("nutrition.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <FeatureBoundary skeleton={<Skeleton className="h-40 rounded-xl" />}>
          <FoodList query={query} />
        </FeatureBoundary>
      </CardContent>
    </Card>
  )
}
