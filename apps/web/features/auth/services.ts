import { apiClient } from "@/lib/hc-client"

// The one place this feature narrows the shared hc client; hooks call these, never hc() directly.
export function createAuthClient(fetch: typeof globalThis.fetch) {
  const api = apiClient(fetch).api
  return { me: api.me, organizations: api.organizations }
}
