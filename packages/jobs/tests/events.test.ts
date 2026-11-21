import { describe, expect, test, vi } from "vitest"

import { createJobs } from "../src"

describe("createJobs().send", () => {
  test("sends a cataloged account event with its payload and dedupe id", async () => {
    const jobs = createJobs({ appId: "test", eventKey: "k", signingKey: "s", isDev: true })
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ids: ["1"], status: 200 }))
    await jobs.send("user.created", { userId: "user_1", email: "u@example.test" }, "user.created:user_1")
    const body = JSON.parse(String(fetchSpy.mock.calls[0]![1]!.body))
    expect(body).toEqual([expect.objectContaining({ id: "user.created:user_1", name: "user.created", data: { userId: "user_1", email: "u@example.test" } })])
    fetchSpy.mockRestore()
  })

  test("event names and payloads are checked by the type system", () => {
    const jobs = createJobs({ appId: "test", eventKey: "k", signingKey: "s", isDev: true })
    // Type-only assertions: these lines are never awaited, so nothing is sent.
    const typeChecks = () => {
      // @ts-expect-error -- not in the event catalog
      void jobs.send("user.renamed", { userId: "u" }, "x")
      // @ts-expect-error -- wrong payload for a cataloged event
      void jobs.send("user.created", { unexpected: "o" }, "x")
    }
    expect(typeChecks).toBeTypeOf("function")
  })
})
