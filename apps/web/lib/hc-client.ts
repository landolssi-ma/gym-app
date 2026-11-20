import { hc } from "hono/client"

import type { AppRoutes } from "@workspace/api"

// The one hc() instantiation point in the app -- every feature's services.ts calls
// apiClient(apiFetch).<namespace> and narrows from there. No feature file calls hc()
// directly, so x-org-id and 401/409 handling (apiFetch) are never silently skipped.
export function apiClient(fetch: typeof globalThis.fetch) {
  return hc<AppRoutes>("/", { fetch })
}
