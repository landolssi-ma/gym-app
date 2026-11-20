"use client"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"

import { meKeys } from "@/features/auth"
import { setActiveOrgId } from "@/lib/active-org"
import { apiFetch } from "@/lib/api-fetch"
import { postOrgSwitch } from "@/lib/broadcast"
import { apiClient } from "@/lib/hc-client"

import { teamKeys } from "./keys"
import * as services from "./services"

const api = () => apiClient(apiFetch)

export function useTeam() {
  return useSuspenseQuery({ queryKey: teamKeys.detail(), queryFn: () => services.getTeam(api()) })
}

export function useTeamActions() {
  const queryClient = useQueryClient()
  const onSuccess = () => Promise.all([queryClient.invalidateQueries({ queryKey: teamKeys.all }), queryClient.invalidateQueries({ queryKey: meKeys.all })])
  return {
    invite: useMutation({ mutationFn: ({ email, role }: { email: string; role: "admin" | "member" }) => services.inviteMember(api(), email, role), onSuccess }),
    revoke: useMutation({ mutationFn: (id: string) => services.revokeInvitation(api(), id), onSuccess }),
    remove: useMutation({ mutationFn: (id: string) => services.removeMember(api(), id), onSuccess }),
    setRole: useMutation({ mutationFn: ({ id, role }: { id: string; role: "admin" | "member" }) => services.setMemberRole(api(), id, role), onSuccess }),
    transfer: useMutation({ mutationFn: (id: string) => services.transferOwnership(api(), id), onSuccess }),
    // The server already moved the session to another workspace; follow it like a switch.
    leave: useMutation({
      mutationFn: () => services.leaveWorkspace(api()),
      onSuccess: ({ activeId }) => {
        setActiveOrgId(activeId)
        postOrgSwitch(activeId)
        queryClient.resetQueries()
      },
    }),
  }
}
