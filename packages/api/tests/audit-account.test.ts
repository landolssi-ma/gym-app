import { describe, expect, test, vi } from "vitest"

import { writeAudit } from "../src/audit"

describe("account audit entries", () => {
  test("writes a session security action", async () => {
    const insert = vi.fn(() => ({ values: vi.fn(async () => undefined) }))
    await writeAudit({ insert } as never, { actorId: "admin", impersonatorId: null, ip: "127.0.0.1" }, {
      action: "session.revoked",
      targetType: "session",
      targetId: "session-id",
    })
    expect(insert).toHaveBeenCalled()
  })

  test("refuses secret-looking audit metadata", async () => {
    await expect(writeAudit({ insert: vi.fn() } as never, { actorId: "admin", impersonatorId: null, ip: null }, {
      action: "user.banned",
      targetType: "user",
      targetId: "user-id",
      metadata: { password: "secret" },
    })).rejects.toThrow("audit metadata.password looks like a secret")
  })
})
