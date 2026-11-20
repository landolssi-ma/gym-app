// Workers' native PBKDF2 instead of Better Auth's JS scrypt, so a password
// sign-in costs native crypto time rather than isolate CPU. 100,000 is the Workers PBKDF2 cap.
const ITERATIONS = 100_000
const hex = (b: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("")
const unhex = (s: string) => new Uint8Array(s.match(/../g)!.map((h) => parseInt(h, 16)))

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password.normalize("NFKC")), "PBKDF2", false, ["deriveBits"])
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `pbkdf2$${ITERATIONS}$${hex(salt)}$${hex(await derive(password, salt, ITERATIONS))}`
}

export async function verifyPassword({ hash, password }: { hash: string; password: string }): Promise<boolean> {
  const [scheme, iterations, salt, expected] = hash.split("$")
  if (scheme !== "pbkdf2" || !iterations || !salt || !expected) return false
  const actual = new Uint8Array(await derive(password, unhex(salt), Number(iterations)))
  const want = unhex(expected)
  let diff = actual.length ^ want.length
  for (let i = 0; i < actual.length; i++) diff |= actual[i]! ^ (want[i] ?? 0)
  return diff === 0
}
