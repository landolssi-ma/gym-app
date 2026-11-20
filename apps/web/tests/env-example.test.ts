import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { ApiEnvKeys } from "@workspace/api/bootstrap"

const example = readFileSync(new URL("../.env.example", import.meta.url), "utf8")
const listed = new Set([...example.matchAll(/^([A-Z0-9_]+)=/gm)].map((m) => m[1]))
// Bindings come from wrangler.jsonc, not .env; locally each is emulated by its own env key.
const BINDING_STAND_INS: Record<string, string> = { HYPERDRIVE: "CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE" }

describe(".env.example", () => {
  it("lists every variable the config schema reads", () => {
    const missing = Object.keys(ApiEnvKeys.shape)
      .map((key) => BINDING_STAND_INS[key] ?? key)
      .filter((key) => !listed.has(key))
    expect(missing).toEqual([])
  })

  it("marks the section of every optional variable as optional", () => {
    const optional = Object.entries(ApiEnvKeys.shape).filter(([, schema]) => schema.safeParse(undefined).success && !("def" in schema && schema.def.type === "default"))
    for (const [key] of optional) {
      const before = example.slice(0, example.search(new RegExp(`^${key}=`, "m")))
      const section = before.slice(before.lastIndexOf("# ──"))
      expect(section, key).toMatch(/optional/)
    }
  })
})
