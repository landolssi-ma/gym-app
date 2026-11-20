import { describe, expect, test, vi } from "vitest"

import { createJobs } from "../src"

describe("createJobs().send", () => {
  test("sends a cataloged event with its payload and dedupe id", async () => {
    const jobs = createJobs({ appId: "test", eventKey: "k", signingKey: "s", isDev: true })
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ids: ["1"], status: 200 }))
    await jobs.send("organization.deleted", { organizationId: "org_1" }, "organization.deleted:org_1")
    const body = JSON.parse(String(fetchSpy.mock.calls[0]![1]!.body))
    expect(body).toEqual([expect.objectContaining({ id: "organization.deleted:org_1", name: "organization.deleted", data: { organizationId: "org_1" } })])
    fetchSpy.mockRestore()
  })

  test("event names and payloads are checked by the type system", () => {
    const jobs = createJobs({ appId: "test", eventKey: "k", signingKey: "s", isDev: true })
    // Type-only assertions: these lines are never awaited, so nothing is sent.
    const typeChecks = () => {
      // @ts-expect-error -- not in the event catalog
      void jobs.send("user.renamed", { userId: "u" }, "x")
      // @ts-expect-error -- wrong payload for a cataloged event
      void jobs.send("user.created", { organizationId: "o" }, "x")
    }
    expect(typeChecks).toBeTypeOf("function")
  })
})
