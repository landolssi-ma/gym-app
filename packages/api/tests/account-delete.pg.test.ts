import { afterAll, describe, expect, test } from "vitest"

import { TEST_PG_URL } from "@workspace/db/testing"

import { createPgApp } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("account deletion against real Postgres", () => {
  const t = TEST_PG_URL ? createPgApp() : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())

  test("wrong confirmation is refused and exact confirmation revokes the account", async () => {
    const email = t.email("delete")
    const jar = await t.signIn(email)
    expect((await t.call("/api/account/delete", { method: "POST", body: { confirm: "wrong" }, cookie: jar })).status).toBe(400)
    expect((await t.call("/api/account/delete", { method: "POST", body: { confirm: email }, cookie: jar })).status).toBe(200)
    expect((await t.call("/api/me", { cookie: jar })).status).toBe(401)
  })
})
