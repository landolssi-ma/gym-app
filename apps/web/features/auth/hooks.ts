"use client"

import { useQuery, useSuspenseQuery } from "@tanstack/react-query"

import { ApiError, apiFetch } from "@/lib/api-fetch"

import { meKeys } from "./keys"
import { createAuthClient } from "./services"

async function getMe() {
  const res = await createAuthClient(apiFetch).me.$get()
  if (!res.ok) throw new ApiError(res.status, "me_fetch_failed")
  return res.json()
}

export type Me = Awaited<ReturnType<typeof getMe>>

export function useMe() {
  return useSuspenseQuery({
    queryKey: meKeys.detail(),
    queryFn: getMe,
    staleTime: 60_000,
  })
}

export function useIsImpersonating(): boolean {
  return useMe().data.impersonating
}

export function useImpersonationBanner() {
  return useQuery({
    queryKey: meKeys.detail(),
    queryFn: getMe,
    staleTime: 60_000,
  })
}
