import { beforeEach, describe, expect, it, vi } from "vitest"

import { getActiveOrgId, setActiveOrgId, subscribe } from "../../lib/active-org"

// Module-level store: reset state between tests since it is not torn down automatically.
beforeEach(() => {
  setActiveOrgId(null as unknown as string)
})

describe("active-org", () => {
  it("starts null", () => {
    expect(getActiveOrgId()).toBeNull()
  })

  it("updates the value and notifies subscribers with the new id", () => {
    const cb = vi.fn()
    subscribe(cb)
    setActiveOrgId("org_1")
    expect(getActiveOrgId()).toBe("org_1")
    expect(cb).toHaveBeenCalledWith("org_1")
  })

  it("stops notifying once unsubscribed", () => {
    const cb = vi.fn()
    const unsubscribe = subscribe(cb)
    unsubscribe()
    setActiveOrgId("org_2")
    expect(cb).not.toHaveBeenCalled()
  })
})
