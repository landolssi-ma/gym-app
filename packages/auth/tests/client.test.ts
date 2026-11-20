import { afterEach, beforeAll, expect, test, vi } from "vitest"

// The client resolves relative auth URLs against the page origin.
beforeAll(() => {
  vi.stubGlobal("window", { location: { origin: "https://app.test", href: "https://app.test/sign-in" } })
})
afterEach(() => vi.unstubAllGlobals())

const client = () => import("../src/client")

test("a Better Auth error reaches the UI as { ok: false, status, code }", async () => {
  vi.stubGlobal("window", { location: { origin: "https://app.test", href: "https://app.test/sign-in" } })
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code: "EMAIL_NOT_VERIFIED", message: "Email not verified" }, { status: 403 })))
  const { signInWithPassword } = await client()
  expect(await signInWithPassword("a@b.test", "correct horse", "/")).toEqual({ ok: false, status: 403, code: "EMAIL_NOT_VERIFIED" })
})

test("success is { ok: true }", async () => {
  vi.stubGlobal("window", { location: { origin: "https://app.test", href: "https://app.test/sign-in" } })
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true })))
  const { sendSignInCode } = await client()
  expect(await sendSignInCode("a@b.test")).toEqual({ ok: true })
})

test("a network failure is { ok: false } without a status", async () => {
  vi.stubGlobal("window", { location: { origin: "https://app.test", href: "https://app.test/sign-in" } })
  vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network down") }))
  const { requestPasswordReset } = await client()
  expect(await requestPasswordReset("a@b.test", "/reset-password")).toMatchObject({ ok: false })
})
