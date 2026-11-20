import { ApiError } from "@/lib/api-fetch"
import { apiClient } from "@/lib/hc-client"

type Client = ReturnType<typeof apiClient>

async function checked<T>(response: { ok: boolean; status: number; json: () => Promise<T> }): Promise<T> {
  if (response.ok) return response.json()
  const body = (await response.json().catch(() => null)) as { error?: string } | null
  throw new ApiError(response.status, body?.error ?? "unknown")
}

export const getTeam = (api: Client) => api.api.team.$get().then(checked)
export const inviteMember = (api: Client, email: string, role: "admin" | "member") => api.api.team.invites.$post({ json: { email, role } }).then(checked)
export const revokeInvitation = (api: Client, id: string) => api.api.team.invites[":id"].$delete({ param: { id } }).then(checked)
export const removeMember = (api: Client, id: string) => api.api.team.members[":id"].$delete({ param: { id } }).then(checked)
export const setMemberRole = (api: Client, id: string, role: "admin" | "member") => api.api.team.members[":id"].$patch({ param: { id }, json: { role } }).then(checked)
// The route answers through its error-mapping wrapper, so its body type is not inferred.
export const leaveWorkspace = (api: Client) => api.api.team.leave.$post().then(checked) as Promise<{ activeId: string }>
export const transferOwnership = (api: Client, memberId: string) => api.api.team["transfer-ownership"].$post({ json: { memberId } }).then(checked)
export const acceptInvitation = (api: Client, id: string) => api.api.team.invites[":id"].accept.$post({ param: { id } })

export type TeamData = Awaited<ReturnType<typeof getTeam>>
