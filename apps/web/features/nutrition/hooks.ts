"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api-fetch"
import { apiClient } from "@/lib/hc-client"

import * as services from "./services"

const api = () => apiClient(apiFetch)

export const nutritionKeys = {
  needs: ["nutrition", "needs"] as const,
  foods: (q?: string) => ["nutrition", "foods", q ?? ""] as const,
  entries: (date: string) => ["nutrition", "entries", date] as const,
}

export function useNutritionNeeds() {
  return useQuery({
    queryKey: nutritionKeys.needs,
    queryFn: () => services.getNutritionNeeds(api()),
    retry: false,
  })
}

export function useFoods(q?: string) {
  return useQuery({
    queryKey: nutritionKeys.foods(q),
    queryFn: () => services.getFoods(api(), q),
  })
}

export function useMealEntries(date: string) {
  return useQuery({
    queryKey: nutritionKeys.entries(date),
    queryFn: () => services.getMealEntries(api(), date),
  })
}

export function useCreateFood() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (json: Parameters<typeof services.createFood>[1]) => services.createFood(api(), json),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nutrition", "foods"] }),
  })
}

export function useDeleteFood() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => services.deleteFood(api(), id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nutrition", "foods"] }),
  })
}

export function useCreateMealEntry(date: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (json: Parameters<typeof services.createMealEntry>[1]) => services.createMealEntry(api(), json),
    onSuccess: () => qc.invalidateQueries({ queryKey: nutritionKeys.entries(date) }),
  })
}

export function useDeleteMealEntry(date: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => services.deleteMealEntry(api(), id),
    onSuccess: () => qc.invalidateQueries({ queryKey: nutritionKeys.entries(date) }),
  })
}
