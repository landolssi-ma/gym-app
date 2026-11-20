import { describe, expect, it } from "vitest"

import { messages } from "@workspace/i18n"

import { errorMessage } from "../../lib/errors"

describe("errorMessage", () => {
  it("maps a known code to its message", () => {
    expect(errorMessage("rate_limited")).toBe(messages.errors.rate_limited)
  })

  it.each([["no_such_code"], [undefined], [42]])("shows the generic message for %j", (code) => {
    expect(errorMessage(code)).toBe(messages.errors.generic)
  })
})
