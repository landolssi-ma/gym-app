import { getActiveOrgId } from "./active-org"
import { notifyLocalOrgChange } from "./broadcast"

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    // Error-specific fields of the body, for example the reason of a 402.
    public body: Record<string, unknown> = {},
  ) {
    super(message)
  }
}

export type UpgradeRequired = { reason: string; used?: number; limit?: number }
export const UPGRADE_REQUIRED_EVENT = "upgrade-required"

// The single boundary every feature's services.ts injects into (via apiClient(apiFetch)): attaches
// x-org-id once the active-org store is seeded, and handles the statuses every feature shares --
// 401 sends the browser to sign-in, 409 org_changed reloads into the current workspace, 402 opens
// the upgrade dialog -- so no feature handles them itself. Other errors pass through unmodified.
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  const orgId = getActiveOrgId()
  if (orgId) headers.set("x-org-id", orgId)

  const res = await globalThis.fetch(input, { ...init, headers })

  if (res.status === 401) {
    // A plain module has no router; a stale session needs a full top-level navigation anyway.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`)
    throw new ApiError(401, "unauthorized")
  }

  if (res.status === 409 || res.status === 402) {
    // Read via a clone: the original's body must stay unread for the pass-through branch below.
    const body = (await res.clone().json().catch(() => null)) as ({ error?: string } & Record<string, unknown>) | null
    if (res.status === 409 && body?.error === "org_changed") {
      notifyLocalOrgChange()
      throw new ApiError(409, "org_changed")
    }
    if (res.status === 402 && body?.error === "upgrade_required") {
      const { error: _error, ...detail } = body
      window.dispatchEvent(new CustomEvent<UpgradeRequired>(UPGRADE_REQUIRED_EVENT, { detail: detail as UpgradeRequired }))
      throw new ApiError(402, "upgrade_required", detail)
    }
  }

  return res
}
