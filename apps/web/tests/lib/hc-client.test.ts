import { expect, it, vi } from "vitest"

import { apiClient } from "../../lib/hc-client"

it("uses the API route prefix exactly once", async () => {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response("{}", { status: 200 }))

  await apiClient(fetchMock).api.health.$get()

  expect(fetchMock).toHaveBeenCalledOnce()
  expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/health")
})
