"use client"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"

import type { Interval, PlanId } from "@workspace/billing"

import { ApiError, apiFetch } from "@/lib/api-fetch"
import { apiClient } from "@/lib/hc-client"

import { billingKeys } from "./keys"

const billing = () => apiClient(apiFetch).api.billing

// The success body, typed without the route's error bodies.
async function checked<R extends { ok: boolean; status: number; json(): Promise<unknown> }>(res: R): Promise<Exclude<Awaited<ReturnType<R["json"]>>, { error: string }>> {
  if (res.ok) return (await res.json()) as Exclude<Awaited<ReturnType<R["json"]>>, { error: string }>
  const body = (await res.json().catch(() => null)) as { error?: string; limit?: string } | null
  throw new ApiError(res.status, body?.error ?? "unknown", body ?? {})
}

export function useBilling() {
  return useSuspenseQuery({ queryKey: billingKeys.detail(), queryFn: () => billing().$get().then(checked) })
}
export type BillingData = ReturnType<typeof useBilling>["data"]

export function useBillingActions() {
  const queryClient = useQueryClient()
  // The webhook writes the change a moment after the provider accepts it: refetch a few times.
  const converge = () => {
    for (const delay of [0, 2000, 5000, 10000]) setTimeout(() => void queryClient.invalidateQueries({ queryKey: billingKeys.all }), delay)
  }
  const plan = (p: { plan: PlanId; interval: Interval }) => ({ json: p })
  return {
    preview: useMutation({ mutationFn: (p: { plan: PlanId; interval: Interval }) => billing()["change-plan"].preview.$post(plan(p)).then(checked) }),
    change: useMutation({ mutationFn: (p: { plan: PlanId; interval: Interval }) => billing()["change-plan"].$post(plan(p)).then(checked), onSuccess: converge }),
    cancel: useMutation({ mutationFn: () => billing().cancel.$post().then(checked), onSuccess: converge }),
    resume: useMutation({ mutationFn: () => billing().resume.$post().then(checked), onSuccess: converge }),
    checkout: useMutation({ mutationFn: (p: { plan: PlanId; interval: Interval }) => billing().checkout.$post(plan(p)).then(checked) }),
    portal: useMutation({ mutationFn: () => billing().portal.$post().then(checked) }),
  }
}
