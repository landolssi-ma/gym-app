import { afterAll, describe, expect, test } from "vitest"

import { TEST_PG_URL } from "@workspace/db/testing"

import { createPgApp } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("account-owned projects against real Postgres", () => {
  const t = TEST_PG_URL ? createPgApp() : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())

  test("a project is readable only by its account", async () => {
    const first = await t.signIn(t.email("first"))
    const second = await t.signIn(t.email("second"))
    const created = await t.call("/api/projects", {
      method: "POST",
      cookie: first,
      body: { name: "Private project", description: "Account only" },
    })
    expect(created.status).toBe(201)
    const project = await created.json() as { id: string }
    expect((await t.call(`/api/projects/${project.id}`, { cookie: second })).status).toBe(404)
  })
})
