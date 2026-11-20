import { ApiError } from "@/lib/api-fetch"
import { apiClient } from "@/lib/hc-client"

type Client = ReturnType<typeof apiClient>

// The success body, typed without the route's error bodies.
async function checked<R extends { ok: boolean; status: number; json(): Promise<unknown> }>(res: R): Promise<Exclude<Awaited<ReturnType<R["json"]>>, { error: string }>> {
  if (res.ok) return (await res.json()) as Exclude<Awaited<ReturnType<R["json"]>>, { error: string }>
  const body = (await res.json().catch(() => null)) as { error?: string } | null
  throw new ApiError(res.status, body?.error ?? "unknown")
}

export type ProjectInput = { name: string; description: string }

export const listProjects = (api: Client) => api.api.projects.$get().then(checked)
export const createProject = (api: Client, json: ProjectInput) => api.api.projects.$post({ json }).then(checked)
export const updateProject = (api: Client, id: string, json: Partial<ProjectInput>) => api.api.projects[":id"].$patch({ param: { id }, json }).then(checked)
export const deleteProject = (api: Client, id: string) => api.api.projects[":id"].$delete({ param: { id } }).then(checked)

// A CSV body, not JSON. A 402 (no export on this plan) is handled by apiFetch's upgrade dialog.
export async function exportProjects(api: Client): Promise<Blob> {
  const res = await api.api.projects.export.$get()
  if (!res.ok) throw new ApiError(res.status, "export_failed")
  return res.blob()
}

export type Project = Awaited<ReturnType<typeof listProjects>>["projects"][number]
