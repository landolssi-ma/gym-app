"use client"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api-fetch"
import { apiClient } from "@/lib/hc-client"

import { projectsKeys } from "./keys"
import * as services from "./services"

const api = () => apiClient(apiFetch)

export function useProjects() {
  return useSuspenseQuery({ queryKey: projectsKeys.list(), queryFn: () => services.listProjects(api()) })
}

export function useProjectActions() {
  const queryClient = useQueryClient()
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: projectsKeys.all })
  return {
    create: useMutation({ mutationFn: (input: services.ProjectInput) => services.createProject(api(), input), onSuccess }),
    update: useMutation({ mutationFn: ({ id, ...input }: { id: string } & Partial<services.ProjectInput>) => services.updateProject(api(), id, input), onSuccess }),
    remove: useMutation({ mutationFn: (id: string) => services.deleteProject(api(), id), onSuccess }),
    exportCsv: useMutation({ mutationFn: () => services.exportProjects(api()) }),
  }
}
