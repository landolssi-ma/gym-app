import { describe, expect, test } from "vitest"

import { t } from "../src"

describe("t", () => {
  test("formats a message with its values", () => {
    expect(t("app.dashboardBody")).toBe("Your account is ready. Build your product here.")
  })

  test("keys are checked against en.json at compile time", () => {
    // @ts-expect-error -- not a key in en.json
    const missing = () => t("common.doesNotExist")
    expect(missing).toBeTypeOf("function")
  })
})
