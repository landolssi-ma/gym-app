import { afterAll, describe, expect, test } from "vitest"

import { eq, organization } from "@workspace/db"
import { TEST_PG_URL } from "@workspace/db/testing"

import { createPgApp } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("suspended workspace against real Postgres", () => {
  const t = TEST_PG_URL ? createPgApp() : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())

  test("workspace routes answer 403 org_suspended; listing and switching away still work; unsuspending restores access", async () => {
    const jar = await t.signIn(t.email("suspended"))
    const personal = ((await (await t.call("/api/organizations", { cookie: jar })).json()) as { activeId: string }).activeId
    const acme = ((await (await t.call("/api/organizations", { method: "POST", body: { name: "Acme" }, cookie: jar })).json()) as { id: string }).id
    await t.db.update(organization).set({ suspended: true }).where(eq(organization.id, acme))

    const refused = await t.call("/api/team", { cookie: jar })
    expect([refused.status, await refused.json()]).toEqual([403, { error: "org_suspended" }])
    expect((await t.call("/api/organizations", { cookie: jar })).status).toBe(200)
    expect((await t.call(`/api/organizations/${personal}/switch`, { method: "POST", cookie: jar })).status).toBe(200)
    expect((await t.call("/api/team", { cookie: jar })).status).toBe(200)

    await t.db.update(organization).set({ suspended: false }).where(eq(organization.id, acme))
    await t.call(`/api/organizations/${acme}/switch`, { method: "POST", cookie: jar })
    expect((await t.call("/api/team", { cookie: jar })).status).toBe(200)
  })
})
