import { expect, test } from "vitest"

import { newOrgSlug, personalOrgName } from "../src/organizations"

test("personalOrgName: first word of the name", () => {
  expect(personalOrgName({ name: "Ada Lovelace", email: "a@x.com" })).toBe("Ada's workspace")
})

test("personalOrgName: an empty name falls back to the email local part", () => {
  expect(personalOrgName({ name: "   ", email: "jo.doe@x.com" })).toBe("jo.doe's workspace")
})

test("newOrgSlug: 12 lowercase hex chars, random, never derived from name or email", () => {
  const [a, b] = [newOrgSlug(), newOrgSlug()]
  expect(a).toMatch(/^[0-9a-f]{12}$/)
  expect(a).not.toBe(b)
})
