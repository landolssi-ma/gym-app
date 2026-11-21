import { describe, expect, it } from "vitest"

import { ApiError } from "../../lib/api-fetch"
import { createQueryClient } from "../../lib/query-client"

describe("createQueryClient", () => {
  it("never retries a query on a 401 ApiError, regardless of failureCount", () => {
    const client = createQueryClient()
    const retry = client.getDefaultOptions().queries?.retry as (failureCount: number, error: unknown) => boolean
    expect(retry(0, new ApiError(401, "unauthorized"))).toBe(false)
    expect(retry(5, new ApiError(401, "unauthorized"))).toBe(false)
  })

  it("retries an ordinary error up to the library's default of 3 attempts", () => {
    const client = createQueryClient()
    const retry = client.getDefaultOptions().queries?.retry as (failureCount: number, error: unknown) => boolean
    expect(retry(0, new Error("network"))).toBe(true)
    expect(retry(1, new Error("network"))).toBe(true)
    expect(retry(2, new Error("network"))).toBe(true)
    expect(retry(3, new Error("network"))).toBe(false)
  })

  it("never retries a mutation, even for an ordinary error", () => {
    const client = createQueryClient()
    const retry = client.getDefaultOptions().mutations?.retry as (failureCount: number, error: unknown) => boolean
    expect(retry(0, new Error("network"))).toBe(false)
    expect(retry(0, new ApiError(401, "unauthorized"))).toBe(false)
  })
})
