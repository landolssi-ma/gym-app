import { ApiError } from "@/lib/api-fetch"
import { apiClient } from "@/lib/hc-client"

type Client = ReturnType<typeof apiClient>

// The success body, typed without the route's error bodies.
async function checked<R extends { ok: boolean; status: number; json(): Promise<unknown> }>(res: R): Promise<Exclude<Awaited<ReturnType<R["json"]>>, { error: string }>> {
  if (res.ok) return (await res.json()) as Exclude<Awaited<ReturnType<R["json"]>>, { error: string }>
  const body = (await res.json().catch(() => null)) as { error?: string } | null
  throw new ApiError(res.status, body?.error ?? "unknown")
}

// Only the filters that are set: an empty string is "no filter", not a match on "".
const set = <T extends Record<string, string | undefined>>(q: T) => Object.fromEntries(Object.entries(q).filter(([, v]) => v)) as T

const admin = (api: Client) => api.api.admin

export type AuditFilters = { actorId?: string; action?: string; from?: string; to?: string }

export const getUsers = (api: Client, q?: string, cursor?: string) => admin(api).users.$get({ query: set({ q, cursor }) }).then(checked)
export const getUser = (api: Client, id: string) => admin(api).users[":id"].$get({ param: { id } }).then(checked)
export const banUser = (api: Client, id: string, reason: string, expiresAt: string | null) => admin(api).users[":id"].ban.$post({ param: { id }, json: { reason, expiresAt } }).then(checked)
export const unbanUser = (api: Client, id: string) => admin(api).users[":id"].unban.$post({ param: { id } }).then(checked)
export const revokeSession = (api: Client, id: string, sessionId: string) => admin(api).users[":id"].sessions[":sessionId"].revoke.$post({ param: { id, sessionId } }).then(checked)

export const getAuditLog = (api: Client, f: AuditFilters, cursor?: string) => admin(api).audit.$get({ query: set({ ...f, cursor }) }).then(checked)

export type UserDetail = Awaited<ReturnType<typeof getUser>>
