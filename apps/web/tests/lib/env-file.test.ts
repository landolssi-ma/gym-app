import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { upsertEnvFile, upsertEnvVar } from "../../lib/env-file"

describe("upsertEnvVar", () => {
  it("replaces an existing KEY=... line in place", () => {
    const content = 'A=1\nKEY=old\nB="has = inside"\n'
    expect(upsertEnvVar(content, "KEY", "new")).toBe('A=1\nKEY=new\nB="has = inside"\n')
  })

  it("appends a new KEY=value line when absent", () => {
    expect(upsertEnvVar("A=1\n", "KEY", "new")).toBe("A=1\nKEY=new\n")
  })

  it("leaves every other line byte-identical, including comments and quoted values with = inside", () => {
    const content = '# a comment\nA=1\n\nB="x=y"\nKEY=old\n'
    const result = upsertEnvVar(content, "KEY", "new")
    expect(result).toBe('# a comment\nA=1\n\nB="x=y"\nKEY=new\n')
  })
})

describe("upsertEnvFile", () => {
  it("applies updates against a real temp file, idempotently on a second call", () => {
    const dir = mkdtempSync(join(tmpdir(), "env-file-"))
    const path = join(dir, ".env")
    writeFileSync(path, "# keep me\nBILLING_API_KEY=old-key\nUNRELATED=keep\n")

    upsertEnvFile(path, { BILLING_PRODUCT_STARTER: "pdt_1" })
    const first = readFileSync(path, "utf8")
    expect(first).toBe("# keep me\nBILLING_API_KEY=old-key\nUNRELATED=keep\nBILLING_PRODUCT_STARTER=pdt_1\n")

    upsertEnvFile(path, { BILLING_PRODUCT_STARTER: "pdt_1" })
    const second = readFileSync(path, "utf8")
    expect(second).toBe(first)
  })
})
