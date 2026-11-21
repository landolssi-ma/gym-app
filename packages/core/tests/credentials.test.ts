import { describe, expect, it } from "vitest"

import { decryptCredentials, encryptCredentials } from "../src/credentials"

const key = btoa("a".repeat(32))
const context = { userId: "owner", purpose: "webhook" }
const credentials = { accountId: "acct_123", apiToken: "private-test-token" }

describe("integration credentials", () => {
  it("round trips with random IVs and never stores plaintext", async () => {
    const a = await encryptCredentials(credentials, key, context)
    const b = await encryptCredentials(credentials, key, context)
    expect(a).not.toBe(b)
    expect(a).not.toContain(credentials.apiToken)
    expect(a).not.toContain(credentials.accountId)
    expect(JSON.parse(a).v).toBe(1)
    expect(await decryptCredentials(a, key, context)).toEqual(credentials)
  })

  it("rejects tampering, mismatched context, wrong keys, and unknown versions", async () => {
    const envelope = await encryptCredentials(credentials, key, context)
    for (const field of ["userId", "purpose"] as const) {
      await expect(decryptCredentials(envelope, key, { ...context, [field]: "other" })).rejects.toThrow("invalid_credentials_envelope")
    }
    await expect(decryptCredentials(envelope, btoa("b".repeat(32)), context)).rejects.toThrow("invalid_credentials_envelope")
    const parsed = JSON.parse(envelope)
    parsed.ciphertext = (parsed.ciphertext[0] === "A" ? "B" : "A") + parsed.ciphertext.slice(1)
    await expect(decryptCredentials(JSON.stringify(parsed), key, context)).rejects.toThrow("invalid_credentials_envelope")
    await expect(decryptCredentials(envelope.replace('"v":1', '"v":2'), key, context)).rejects.toThrow("invalid_credentials_envelope")
    await expect(encryptCredentials(credentials, btoa("short"), context)).rejects.toThrow("invalid_integration_key")
  })
})
