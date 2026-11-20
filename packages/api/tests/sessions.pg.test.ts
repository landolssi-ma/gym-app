import { afterAll, describe, expect, test } from "vitest"

import { TEST_PG_URL } from "@workspace/db/testing"

import { createPgApp } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("own sessions against real Postgres", () => {
  const t = TEST_PG_URL ? createPgApp() : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  type List = { sessions: { id: string; country: string | null; userAgent: string | null; current: boolean; lastActiveAt: string }[] }

  test("lists sessions with device, country and last active, marks the current one, and revokes another", async () => {
    const email = t.email("sessions")
    const first = await t.signIn(email)
    const send = await t.app.request("https://app.test/api/auth/email-otp/send-verification-otp", { method: "POST", headers: { origin: "https://app.test", "content-type": "application/json", "cf-connecting-ip": "10.77.0.1" }, body: JSON.stringify({ email, type: "sign-in" }) })
    expect(send.status).toBe(200)
    const second = t.jarFrom(
      await t.app.request("https://app.test/api/auth/sign-in/email-otp", {
        method: "POST",
        headers: { origin: "https://app.test", "content-type": "application/json", "cf-connecting-ip": "10.77.0.2", "cf-ipcountry": "FR", "user-agent": "Firefox/140" },
        body: JSON.stringify({ email, otp: t.codes.get(email) }),
      }),
    )
    const list = (await (await t.call("/api/account/sessions", { cookie: first })).json()) as List
    expect(list.sessions).toHaveLength(2)
    expect(list.sessions.filter((s) => s.current)).toHaveLength(1)
    const other = list.sessions.find((s) => !s.current)!
    expect(other).toMatchObject({ country: "FR", userAgent: "Firefox/140" })
    expect(Date.parse(other.lastActiveAt)).not.toBeNaN()

    expect((await t.call(`/api/account/sessions/${other.id}`, { method: "DELETE", cookie: first })).status).toBe(200)
    expect((await t.call("/api/account/sessions", { cookie: second })).status).toBe(401)
    expect((await t.call("/api/account/sessions", { cookie: first })).status).toBe(200)
  })

  test("another user's session id is 404 and stays signed in", async () => {
    const mine = await t.signIn(t.email("mine"))
    const theirs = await t.signIn(t.email("theirs"))
    const theirId = ((await (await t.call("/api/account/sessions", { cookie: theirs })).json()) as List).sessions[0]!.id
    expect((await t.call(`/api/account/sessions/${theirId}`, { method: "DELETE", cookie: mine })).status).toBe(404)
    expect((await t.call("/api/account/sessions", { cookie: theirs })).status).toBe(200)
  })

  test("sign out everywhere revokes every session, including the current one", async () => {
    const email = t.email("everywhere")
    const a = await t.signIn(email)
    const b = await t.signIn(email)
    expect((await t.call("/api/auth/revoke-sessions", { method: "POST", body: {}, cookie: a })).status).toBe(200)
    expect((await t.call("/api/account/sessions", { cookie: a })).status).toBe(401)
    expect((await t.call("/api/account/sessions", { cookie: b })).status).toBe(401)
  })
})
