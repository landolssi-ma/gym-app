import type { FilePurpose } from "@workspace/api/files"

import { ApiError } from "@/lib/api-fetch"
import { apiClient } from "@/lib/hc-client"

type Client = ReturnType<typeof apiClient>

// The success body, typed without the route's error bodies.
async function checked<R extends { ok: boolean; status: number; json(): Promise<unknown> }>(res: R): Promise<Exclude<Awaited<ReturnType<R["json"]>>, { error: string }>> {
  if (res.ok) return (await res.json()) as Exclude<Awaited<ReturnType<R["json"]>>, { error: string }>
  const body = (await res.json().catch(() => null)) as { error?: string } | null
  throw new ApiError(res.status, body?.error ?? "unknown")
}

export const declareFile = (api: Client, json: { name: string; contentType: string; size: number; purpose: FilePurpose }) => api.api.files.$post({ json }).then(checked)
export const completeFile = (api: Client, id: string) => api.api.files[":id"].complete.$post({ param: { id } }).then(checked)
export const fileDownloadUrl = (api: Client, id: string) => api.api.files[":id"].download.$get({ param: { id } }).then(checked)
export const deleteFile = (api: Client, id: string) => api.api.files[":id"].$delete({ param: { id } }).then(checked)
