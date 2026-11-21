"use client"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api-fetch"
import { apiClient } from "@/lib/hc-client"

import { backofficeKeys } from "./keys"
import * as s from "./services"

const api = () => apiClient(apiFetch)

export const useUsers = (q: string, cursor?: string) => useSuspenseQuery({ queryKey: backofficeKeys.list("users", { q }, cursor), queryFn: () => s.getUsers(api(), q, cursor) })
export const useUser = (id: string) => useSuspenseQuery({ queryKey: backofficeKeys.detail("users", id), queryFn: () => s.getUser(api(), id) })
export const useAuditLog = (f: s.AuditFilters, cursor?: string) => useSuspenseQuery({ queryKey: backofficeKeys.list("audit", f, cursor), queryFn: () => s.getAuditLog(api(), f, cursor) })

// Every action refetches all backoffice data: lists, details and the audit log all show its effect.
export function useBackofficeActions() {
  const queryClient = useQueryClient()
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: backofficeKeys.all })
  return {
    ban: useMutation({ mutationFn: (v: { id: string; reason: string; expiresAt: string | null }) => s.banUser(api(), v.id, v.reason, v.expiresAt), onSuccess }),
    unban: useMutation({ mutationFn: (id: string) => s.unbanUser(api(), id), onSuccess }),
    revokeSession: useMutation({ mutationFn: (v: { id: string; sessionId: string }) => s.revokeSession(api(), v.id, v.sessionId), onSuccess }),
  }
}
