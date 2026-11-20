export type CredentialContext = { userId: string; organizationId: string; purpose: string }
export type CredentialEnvelope = { v: 1; iv: string; ciphertext: string }

const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const decode = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0))

async function importKey(key: string) {
  const bytes = decode(key)
  if (bytes.length !== 32) throw new Error("invalid_integration_key")
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"])
}

const aad = (context: CredentialContext) =>
  new TextEncoder().encode(JSON.stringify([context.userId, context.organizationId, context.purpose]))

export async function encryptCredentials(value: unknown, key: string, context: CredentialContext): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad(context) },
    await importKey(key),
    new TextEncoder().encode(JSON.stringify(value)),
  )
  const envelope: CredentialEnvelope = { v: 1, iv: encode(iv), ciphertext: encode(new Uint8Array(ciphertext)) }
  return JSON.stringify(envelope)
}

export async function decryptCredentials(value: string, key: string, context: CredentialContext): Promise<unknown> {
  try {
    const envelope = JSON.parse(value) as CredentialEnvelope
    if (envelope.v !== 1 || typeof envelope.iv !== "string" || typeof envelope.ciphertext !== "string") throw new Error()
    const iv = decode(envelope.iv)
    if (iv.length !== 12) throw new Error()
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: aad(context) },
      await importKey(key),
      decode(envelope.ciphertext),
    )
    return JSON.parse(new TextDecoder().decode(plaintext)) as unknown
  } catch {
    throw new Error("invalid_credentials_envelope")
  }
}
