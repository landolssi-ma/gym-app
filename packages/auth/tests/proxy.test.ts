import { expect, test } from "vitest"

import { hasSessionCookie, isSignedIn } from "../src/proxy"

const PREFIX = "__Host-acme"

test("isSignedIn: true when the api answers 200 with a session object", async () => {
  const req = new Request("https://app.test/dashboard", { headers: { cookie: "__Host-acme.session_token=t" } })
  const api = async (apiReq: Request) => {
    expect(new URL(apiReq.url).pathname).toBe("/api/auth/get-session")
    expect(new URL(apiReq.url).host).toBe(new URL(req.url).host)
    expect(apiReq.headers.get("cookie")).toBe("__Host-acme.session_token=t")
    return new Response(JSON.stringify({ session: { id: "s1" } }), { status: 200 })
  }
  expect(await isSignedIn(req, PREFIX, api)).toBe(true)
})

test("isSignedIn: false when the api answers 200 with null", async () => {
  const req = new Request("https://app.test/dashboard", { headers: { cookie: "__Host-acme.session_token=t" } })
  const api = async () => new Response("null", { status: 200 })
  expect(await isSignedIn(req, PREFIX, api)).toBe(false)
})

test("isSignedIn: false when the api answers non-2xx (e.g. 400 duplicate_cookie)", async () => {
  const req = new Request("https://app.test/dashboard", { headers: { cookie: "__Host-acme.session_token=t" } })
  const api = async () => new Response(JSON.stringify({ code: "duplicate_cookie" }), { status: 400 })
  expect(await isSignedIn(req, PREFIX, api)).toBe(false)
})

test("isSignedIn: false when the api throws", async () => {
  const req = new Request("https://app.test/dashboard", { headers: { cookie: "__Host-acme.session_token=t" } })
  const api = async () => {
    throw new Error("network down")
  }
  expect(await isSignedIn(req, PREFIX, api)).toBe(false)
})

test("isSignedIn: false and api never called when the request has no session cookie", async () => {
  const req = new Request("https://app.test/sign-in")
  const api = async () => {
    throw new Error("api must not be called when there is no session cookie")
  }
  expect(await isSignedIn(req, PREFIX, api)).toBe(false)
})

test("hasSessionCookie: true when the request carries the session token cookie", () => {
  const req = new Request("https://app.test/dashboard", { headers: { cookie: "__Host-acme.session_token=t" } })
  expect(hasSessionCookie(req, PREFIX)).toBe(true)
})

test("hasSessionCookie: false with no cookie header", () => {
  const req = new Request("https://app.test/dashboard")
  expect(hasSessionCookie(req, PREFIX)).toBe(false)
})

test("hasSessionCookie: false for an unrelated cookie name", () => {
  const req = new Request("https://app.test/dashboard", { headers: { cookie: "some_other_cookie=t" } })
  expect(hasSessionCookie(req, PREFIX)).toBe(false)
})
