import { QueryClient } from "@tanstack/react-query"

import { ApiError } from "./api-fetch"

function isSessionError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

// A 401 ApiError is never retried -- replaying the same request only produces another 401.
// Ordinary transient errors still
// retry up to TanStack Query's own v5 default of 3 attempts. Mutations never auto-retry,
// matching TanStack's own default of no automatic mutation retries.
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => (isSessionError(error) ? false : failureCount < 3),
      },
      mutations: {
        retry: () => false,
      },
    },
  })
}
