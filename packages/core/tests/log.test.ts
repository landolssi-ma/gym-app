import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { createLog } from "../src/index"

describe("createLog", () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
  })
  afterEach(() => {
    logSpy.mockRestore()
  })

  function lastLine() {
    return JSON.parse(logSpy.mock.calls.at(-1)![0] as string)
  }

  test("serializes an Error to name, message and stack", () => {
    createLog().error("failed", { err: new Error("boom") })
    expect(lastLine()).toMatchObject({ level: "error", msg: "failed", err: { name: "Error", message: "boom" } })
    expect(lastLine().err.stack).toContain("boom")
  })

  // A wrapped error must not lose its cause in structured logs.
  test("keeps the cause chain instead of dropping it", () => {
    const cause = new Error("root cause")
    createLog().error("failed", { err: new Error("wrapped", { cause }) })
    expect(lastLine().err).toMatchObject({ message: "wrapped", cause: { name: "Error", message: "root cause" } })
  })

  test("omits cause entirely when the error has none", () => {
    createLog().error("failed", { err: new Error("plain") })
    expect(lastLine().err).not.toHaveProperty("cause")
  })

  test("a non-Error cause still serializes", () => {
    const cause = { reason: "upstream_error" }
    createLog().error("failed", { err: new Error("wrapped", { cause }) })
    expect(lastLine().err.cause).toEqual({ reason: "upstream_error" })
  })
})
