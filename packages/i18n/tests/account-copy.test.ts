import { expect, test } from "vitest"

import { messages } from "../src"

const values = (o: object): string[] => Object.values(o).flatMap((v) => (typeof v === "string" ? [v] : values(v as object)))

test("user-facing copy does not describe removed workspace or billing features", () => {
  const shown = values(messages).map((v) => v.replace(/\{[^}]*\}/g, ""))
  expect(shown.filter((v) => /\b(workspaces?|subscriptions?|billing|plans?|team roles)\b/i.test(v))).toEqual([])
})
