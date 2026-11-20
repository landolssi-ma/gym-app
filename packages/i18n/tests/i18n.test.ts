import { describe, expect, test } from "vitest"

import { t } from "../src"

describe("t", () => {
  test("formats a message with its values", () => {
    expect(t("organization.personalName", { firstName: "Ada" })).toBe("Ada's workspace")
  })

  test("keys are checked against en.json at compile time", () => {
    // @ts-expect-error -- not a key in en.json
    const missing = () => t("common.doesNotExist")
    expect(missing).toBeTypeOf("function")
  })
})
