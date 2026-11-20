import { Hono } from "hono"
import { describe, expect, test, vi } from "vitest"
import { z } from "zod"

import { AiError } from "@workspace/ai"

import { createApi, type AppEnv } from "../src/index"
import { json } from "../src/validate"
import { APP, fakeDeps } from "./helpers/fake-deps"

describe("one error format", () => {
  test("an unknown route is 404 not_found", async () => {
    const res = await createApi(() => fakeDeps()).request(`${APP}/api/does-not-exist`)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "not_found" })
  })

  test("a path outside /api is 404 not_found (Next owns it)", async () => {
    expect((await createApi(() => fakeDeps()).request(`${APP}/dashboard`)).status).toBe(404)
  })

  test("an unhandled error is 500 internal; the stack is logged, never sent", async () => {
    const error = vi.fn()
    const app = createApi(() => fakeDeps({ log: { info() {}, warn() {}, error } }))
    app.get("/api/boom", () => {
      throw new Error("db password is hunter2")
    })
    const res = await app.request(`${APP}/api/boom`)
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(JSON.parse(text)).toEqual({ error: "internal" })
    expect(text).not.toContain("hunter2")
    expect(error).toHaveBeenCalledWith("unhandled", { err: expect.objectContaining({ message: "db password is hunter2", stack: expect.any(String) }) })
  })

  test("an AI failure is 502 ai_failed with nothing else, and is not logged again", async () => {
    const error = vi.fn()
    const app = createApi(() => fakeDeps({ log: { info() {}, warn() {}, error } }))
    app.get("/api/ai", () => {
      throw new AiError("provider", 500)
    })
    const res = await app.request(`${APP}/api/ai`)
    expect(res.status).toBe(502)
    expect(await res.text()).toBe(JSON.stringify({ error: "ai_failed" }))
    expect(error).not.toHaveBeenCalled()
  })

  test("deps are closed after every request, through waitUntil", async () => {
    const waitUntil = vi.fn()
    const close = vi.fn(async () => {})
    const app = createApi(() => fakeDeps({ waitUntil, close }))
    await app.request(`${APP}/api/x`)
    await app.request(`${APP}/api/x`)
    expect(close).toHaveBeenCalledTimes(2)
    expect(waitUntil).toHaveBeenCalledTimes(2)
  })
})

describe("json(schema) input validation", () => {
  const write = vi.fn()
  const app = new Hono<AppEnv>().post("/api/things", json(z.object({ name: z.string().min(1), count: z.number().int() })), (c) => {
    write(c.req.valid("json"))
    return c.json({ ok: true })
  })
  const post = (body: unknown) => app.request("/api/things", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })

  test("a valid body reaches the handler, parsed", async () => {
    expect((await post({ name: "a", count: 1 })).status).toBe(200)
    expect(write).toHaveBeenLastCalledWith({ name: "a", count: 1 })
  })

  test.each([[{ count: 1 }], [{ name: "a", count: "1" }], [{ name: "", count: 1 }]])("an invalid body %j is 400 invalid with no side effects", async (body) => {
    write.mockClear()
    const res = await post(body)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "invalid" })
    expect(write).not.toHaveBeenCalled()
  })
})

describe("/media", () => {
  const KEY = "00000000-0000-4000-8000-000000000000"
  const serve = (contentType: string | null) => {
    const get = vi.fn(async () => (contentType === null ? null : { body: new Blob(["x"]).stream(), contentType }))
    return { get, app: createApi(() => fakeDeps({ storage: { get } as never })) }
  }

  test("serves a public image, cacheable and nosniff", async () => {
    const { get, app } = serve("image/png")
    const res = await app.request(`${APP}/media/${KEY}`)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("image/png")
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable")
    expect(res.headers.get("x-content-type-options")).toBe("nosniff")
    expect(get).toHaveBeenCalledWith("public", KEY)
  })

  test.each([["a missing object", null], ["HTML", "text/html"], ["SVG", "image/svg+xml"]])("%s is 404", async (_, type) => {
    expect((await serve(type).app.request(`${APP}/media/${KEY}`)).status).toBe(404)
  })

  test("a key that is not a UUID never reaches storage", async () => {
    const { get, app } = serve("image/png")
    for (const path of ["/media/..%2Fprivate%2Fx", "/media/avatars/x.png", "/media/abc"]) expect((await app.request(`${APP}${path}`)).status).toBe(404)
    expect(get).not.toHaveBeenCalled()
  })
})
