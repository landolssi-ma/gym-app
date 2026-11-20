import { QueryClient } from "@tanstack/react-query"

import { ApiError } from "./api-fetch"

function isSessionOrOrgError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 409)
}

// A 401/409 ApiError is never retried -- the session/org state is already known-bad, so
// replaying the same request only produces another 401/409. Ordinary transient errors still
// retry up to TanStack Query's own v5 default of 3 attempts. Mutations never auto-retry,
// matching TanStack's own default of no automatic mutation retries.
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => (isSessionOrOrgError(error) ? false : failureCount < 3),
      },
      mutations: {
        retry: () => false,
      },
    },
  })
}
