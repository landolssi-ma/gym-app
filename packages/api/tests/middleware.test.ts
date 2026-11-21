import { describe, expect, test } from "vitest"

import { createApi } from "../src/index"
import { APP, COOKIE_PREFIX, fakeDeps } from "./helpers/fake-deps"

const app = createApi(() => fakeDeps())

const send = async (method: string, path: string, headers: Record<string, string> = {}) =>
  (await app.request(`${APP}${path}`, { method, headers })).status

const session = `${COOKIE_PREFIX}.session_token`

// [method, path, headers, expected status]. 404 means the request passed the middleware and reached routing.
const originCases: [string, string, Record<string, string>, number][] = [
  ["POST", "/api/x", { origin: APP }, 404],
  ["POST", "/api/x", { origin: `${APP}/` }, 403],
  ["POST", "/api/x", { origin: `${APP}:443` }, 403],
  ["POST", "/api/x", { origin: "https://evil.test" }, 403],
  ["POST", "/api/x", { origin: "null" }, 403],
  ["POST", "/api/x", { origin: APP.toUpperCase() }, 403],
  ["POST", "/api/x", {}, 403],
  ["PUT", "/api/x", {}, 403],
  ["PATCH", "/api/x", {}, 403],
  ["DELETE", "/api/x", {}, 403],
  ["GET", "/api/x", {}, 404],
  ["HEAD", "/api/x", {}, 404],
  ["OPTIONS", "/api/x", {}, 404],
  ["POST", "/api/inngest", {}, 204],
  ["POST", "/api/inngestx", {}, 403],
]

const cookieCases: [string, string, Record<string, string>, number][] = [
  ["GET", "/api/x", { cookie: `${session}=a; x=1; __host-acme.session_token=b` }, 400],
  ["GET", "/api/x", { cookie: `__host-acme.session_token=b; x=1; ${session}=a` }, 400],
  ["GET", "/api/x", { cookie: `${session}=a; __HOST-ACME.SESSION_TOKEN=b` }, 400],
  ["GET", "/api/x", { cookie: `${session}=a; x=1` }, 404],
  ["GET", "/api/x", {}, 404],
  ["GET", "/api/x", { cookie: ";; ;" }, 404],
  ["GET", "/api/x", { cookie: `acme.session_token=a; ${session}=b` }, 404],
]

describe("exact Origin on state-changing requests", () => {
  test.each(originCases)("%s %s %j -> %i", async (method, path, headers, want) => {
    expect(await send(method, path, headers)).toBe(want)
  })

  test("a refused request gets forbidden_origin", async () => {
    const res = await app.request(`${APP}/api/x`, { method: "POST", headers: { origin: "https://evil.test" } })
    expect(await res.json()).toEqual({ error: "forbidden_origin" })
  })
})

describe("duplicate auth cookie", () => {
  test.each(cookieCases)("%s %s %j -> %i", async (method, path, headers, want) => {
    expect(await send(method, path, headers)).toBe(want)
  })

  test("a refused request gets duplicate_cookie", async () => {
    const res = await app.request(`${APP}/api/x`, { headers: { cookie: `${session}=a; ${session}=b` } })
    expect(await res.json()).toEqual({ error: "duplicate_cookie" })
  })
})

test("middleware is stateless: concurrent requests match the sequential run", async () => {
  const mixed = [...originCases, ...cookieCases]
  const sequential: number[] = []
  for (const [m, p, h] of mixed) sequential.push(await send(m, p, h))
  const concurrent = await Promise.all(mixed.map(([m, p, h]) => send(m, p, h)))
  expect(concurrent).toEqual(sequential)
  expect(sequential).toEqual(mixed.map((c) => c[3]))
})
