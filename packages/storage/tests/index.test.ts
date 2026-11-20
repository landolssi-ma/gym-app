import { afterEach, describe, expect, test, vi } from "vitest"

import { createStorage } from "../src/index"

const appOrigin = "https://app.test"
const endpoint = "https://acct.r2.test"
const storage = () => createStorage({ endpoint, accessKeyId: "AKID", secretAccessKey: "SECRET", bucket: "acme", appOrigin })

describe("storage URLs", () => {
  test("publicUrl serves public objects through the app's /media route", () => {
    expect(storage().publicUrl("avatars/a/b.png")).toBe(`${appOrigin}/media/avatars/a/b.png`)
  })
})

describe("storage S3 calls", () => {
  afterEach(() => vi.unstubAllGlobals())
  const stub = (status: number, body = "") => {
    const calls: Request[] = []
    vi.stubGlobal("fetch", async (r: Request) => (calls.push(r), new Response(status === 404 || status === 204 ? null : body, { status, headers: { "content-type": "image/png" } })))
    return calls
  }

  test("put signs a path-style PUT to the bucket", async () => {
    const calls = stub(200)
    await storage().put("public", "avatars/a b/c.png", new Uint8Array([1]), "image/png")
    expect(calls[0]!.method).toBe("PUT")
    expect(calls[0]!.url).toBe(`${endpoint}/acme/public/avatars/a%20b/c.png`)
    expect(calls[0]!.headers.get("authorization")).toMatch(/^AWS4-HMAC-SHA256 Credential=AKID\//)
  })

  test("get returns null on 404 and body + type otherwise", async () => {
    stub(404)
    expect(await storage().get("private", "x")).toBeNull()
    stub(200, "hi")
    const o = await storage().get("private", "x")
    expect(o!.contentType).toBe("image/png")
    expect(await new Response(o!.body).text()).toBe("hi")
  })

  test("head returns size and type, or null when the object is missing", async () => {
    vi.stubGlobal("fetch", async () => new Response(null, { status: 200, headers: { "content-length": "42", "content-type": "image/png" } }))
    expect(await storage().head("public", "x")).toEqual({ size: 42, contentType: "image/png" })
    stub(404)
    expect(await storage().head("public", "x")).toBeNull()
  })

  test("delete of an already-missing object succeeds", async () => {
    stub(204)
    await expect(storage().delete("private", "gone")).resolves.toBeUndefined()
  })

  test("non-2xx write throws with the S3 error code", async () => {
    stub(403, "<Error><Code>AccessDenied</Code></Error>")
    await expect(storage().put("private", "x", "y", "text/plain")).rejects.toThrow("storage PUT failed: 403 AccessDenied")
  })
})

describe("presigned URLs", () => {
  const params = (u: string) => new URL(u).searchParams

  test("upload URL: one PUT to the key, expires in 15 minutes, signs the declared content type", async () => {
    const u = await storage().uploadUrl("private", "k1", "application/pdf")
    expect(u.startsWith(`${endpoint}/acme/private/k1?`)).toBe(true)
    expect(params(u).get("X-Amz-Expires")).toBe("900")
    expect(params(u).get("X-Amz-SignedHeaders")).toBe("content-type;host")
    expect(params(u).get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256")
    // The signature covers the content type and the key: either change gives a different URL.
    const sig = (x: string) => params(x).get("X-Amz-Signature")
    expect(sig(await storage().uploadUrl("private", "k1", "image/png"))).not.toBe(sig(u))
    expect(sig(await storage().uploadUrl("private", "k2", "application/pdf"))).not.toBe(sig(u))
  })

  test("download URL: a GET that expires in 5 minutes", async () => {
    const u = await storage().downloadUrl("private", "k1")
    expect(params(u).get("X-Amz-Expires")).toBe("300")
    expect(params(u).get("X-Amz-SignedHeaders")).toBe("host")
    expect(Date.now() - Date.parse(params(u).get("X-Amz-Date")!.replace(/(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z/, "$1-$2-$3T$4:$5:$6Z"))).toBeLessThan(5000)
  })

  test("keys are random UUIDs", () => {
    const keys = new Set(Array.from({ length: 100 }, () => storage().newKey()))
    expect(keys.size).toBe(100)
    for (const k of keys) expect(k).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})
