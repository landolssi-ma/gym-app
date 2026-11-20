"use client"

import { useEffect, useState } from "react"

import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"

import { setActiveOrgId } from "@/lib/active-org"
import { ApiError, apiFetch } from "@/lib/api-fetch"
import { onLocalOrgChange, onOrgSwitch, postOrgSwitch } from "@/lib/broadcast"

import { meKeys } from "./keys"
import { createAuthClient } from "./services"

// A non-ok body must not be cached as `me`: FeatureBoundary's Retry only refetches errors.
async function getMe() {
  const res = await createAuthClient(apiFetch).me.$get()
  if (!res.ok) throw new ApiError(res.status, "me_fetch_failed")
  return res.json()
}

export type Me = Awaited<ReturnType<typeof getMe>>

// The one GET /api/me read the shell builds on. Seeds active-org.ts from the real response: the one
// place the store gets a server-confirmed value.
export function useMe() {
  const query = useSuspenseQuery({
    queryKey: meKeys.detail(),
    queryFn: getMe,
    // Matches the layout's seeded HydrationBoundary, so mounting never refetches what the server sent.
    staleTime: 60_000,
  })

  useEffect(() => {
    setActiveOrgId(query.data.activeOrganization.id)
  }, [query.data.activeOrganization.id])

  return query
}

// Every control hidden while impersonating reads the state through this hook.
export function useIsImpersonating(): boolean {
  return useMe().data.impersonating
}

// A non-suspending twin of useMe() for the banner at the (app) layout root, which must not put a
// blocking Suspense boundary over every route. Shares useMe()'s cache.
export function useImpersonationBanner() {
  return useQuery({
    queryKey: meKeys.detail(),
    queryFn: getMe,
    // Same staleTime as useMe(): both read meKeys.detail().
    staleTime: 60_000,
  })
}

// Switches the session's workspace on the server first, then updates this tab and tells the other
// tabs -- never the reverse, so a failed switch is never announced. The URL never changes.
export function useSwitchOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orgId: string) => {
      const res = await createAuthClient(apiFetch).organizations[":id"].switch.$post({ param: { id: orgId } })
      if (!res.ok) throw new ApiError(res.status, "switch_failed")
      return orgId
    },
    onSuccess: (orgId) => {
      setActiveOrgId(orgId)
      postOrgSwitch(orgId)
      // Reset, not invalidate: invalidation would show the previous workspace's data until refetched.
      queryClient.resetQueries()
    },
  })
}

// org-changed-modal.tsx calls resetSignal() after "Keep working here" succeeds, clearing every
// mounted useOrgChangeSignal().
const resetListeners = new Set<() => void>()

export function resetSignal(): void {
  for (const listener of resetListeners) listener()
}

// One boolean fed by either source: another tab's switch, or this tab's own 409 org_changed.
export function useOrgChangeSignal(): boolean {
  const [changed, setChanged] = useState(false)

  useEffect(() => {
    const unsubscribeSwitch = onOrgSwitch(() => setChanged(true))
    const unsubscribeLocal = onLocalOrgChange(() => setChanged(true))
    const reset = () => setChanged(false)
    resetListeners.add(reset)
    return () => {
      unsubscribeSwitch()
      unsubscribeLocal()
      resetListeners.delete(reset)
    }
  }, [])

  return changed
}

export function useCreateOrganization() {
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await createAuthClient(apiFetch).organizations.$post({ json: { name } })
      if (!res.ok) throw new ApiError(res.status, "create_failed")
      return res.json()
    },
    // A full reload into the new workspace: every cached query belonged to the previous one.
    onSuccess: (org) => {
      setActiveOrgId(org.id)
      postOrgSwitch(org.id)
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/dashboard")
    },
  })
}
