// Bearer-link tokens (for example invitation or download links). Raw tokens are never persisted
// or logged -- only their SHA-256 hex digest is.
export function createCapabilityToken(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export async function hashCapabilityToken(token: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

// 32 raw random bytes -> 43-char base64url (no padding): the exact shape createCapabilityToken
// emits. A token failing this check is rejected before any DB lookup runs.
export const CAPABILITY_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/
