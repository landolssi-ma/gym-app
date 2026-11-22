import { ApiError } from "@/lib/api-fetch"
import { apiClient } from "@/lib/hc-client"

type Client = ReturnType<typeof apiClient>

async function checked<R extends { ok: boolean; status: number; json(): Promise<unknown> }>(res: R): Promise<Exclude<Awaited<ReturnType<R["json"]>>, { error: string }>> {
  if (res.ok) return (await res.json()) as Exclude<Awaited<ReturnType<R["json"]>>, { error: string }>
  const body = (await res.json().catch(() => null)) as { error?: string } | null
  throw new ApiError(res.status, body?.error ?? "unknown")
}

export const getNutritionNeeds = (api: Client) => api.api.nutrition.needs.$get().then(checked)

export const getFoods = (api: Client, q?: string) =>
  api.api.nutrition.foods.$get({ query: q ? { q } : {} }).then(checked)

export const createFood = (
  api: Client,
  json: { name: string; preparationState: "raw" | "cooked" | "drained"; caloriesPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number },
) => api.api.nutrition.foods.$post({ json }).then(checked)

export const deleteFood = (api: Client, id: string) =>
  api.api.nutrition.foods[":id"].$delete({ param: { id } }).then(checked)

export const getMealEntries = (api: Client, date: string) =>
  api.api.nutrition["meal-entries"].$get({ query: { date } }).then(checked)

export const createMealEntry = (
  api: Client,
  json: { foodId: string; date: string; slot: "breakfast" | "lunch" | "dinner" | "snack_1" | "snack_2"; weightG: number },
) => api.api.nutrition["meal-entries"].$post({ json }).then(checked)

export const deleteMealEntry = (api: Client, id: string) =>
  api.api.nutrition["meal-entries"][":id"].$delete({ param: { id } }).then(checked)
