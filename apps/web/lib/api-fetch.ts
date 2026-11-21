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

// The single boundary every feature's services.ts injects into (via apiClient(apiFetch)): handles
// the shared 401 session status once, so no feature handles it itself. Other errors pass through
// unmodified.
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  const res = await globalThis.fetch(input, { ...init, headers })

  if (res.status === 401) {
    // A plain module has no router; a stale session needs a full top-level navigation anyway.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`)
    throw new ApiError(401, "unauthorized")
  }

  return res
}
