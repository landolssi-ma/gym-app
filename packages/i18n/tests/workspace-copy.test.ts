import { expect, test } from "vitest"

import { messages } from "../src"

const values = (o: object): string[] => Object.values(o).flatMap((v) => (typeof v === "string" ? [v] : values(v as object)))

// The product says "workspace"; "organization" is the code's word (Better Auth's) and never shown.
// Placeholders like {organizationName} are not shown text, so they are stripped first.
test("no user-facing string says organization", () => {
  const shown = values(messages).map((v) => v.replace(/\{[^}]*\}/g, ""))
  expect(shown.filter((v) => /organi[sz]ation/i.test(v))).toEqual([])
})
