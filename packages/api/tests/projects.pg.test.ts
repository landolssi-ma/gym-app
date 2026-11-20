import { afterAll, describe, expect, test } from "vitest"

import { eq, subscriptions } from "@workspace/db"
import { TEST_PG_URL } from "@workspace/db/testing"

import { createPgApp } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("projects (reference module) against real Postgres", () => {
  const t = TEST_PG_URL ? createPgApp() : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  type Project = { id: string; name: string; description: string }
  const create = (cookie: string, body: unknown) => t.call("/api/projects", { method: "POST", cookie, body })
  const list = async (cookie: string) => ((await (await t.call("/api/projects", { cookie })).json()) as { projects: Project[] }).projects

  test("create, read, update, list and delete in the active workspace", async () => {
    const { jar } = await t.owner("crud")
    const res = await create(jar, { name: "  Launch  ", description: "Q1" })
    expect(res.status).toBe(201)
    const p = (await res.json()) as Project
    expect(p).toMatchObject({ name: "Launch", description: "Q1" })
    expect(await (await t.call(`/api/projects/${p.id}`, { cookie: jar })).json()).toMatchObject({ id: p.id })
    expect(await (await t.call(`/api/projects/${p.id}`, { method: "PATCH", cookie: jar, body: { name: "Relaunch" } })).json()).toMatchObject({ name: "Relaunch", description: "Q1" })
    expect((await list(jar)).map((x) => x.name)).toEqual(["Relaunch"])
    expect((await t.call(`/api/projects/${p.id}`, { method: "DELETE", cookie: jar })).status).toBe(200)
    expect(await list(jar)).toEqual([])
  })

  test("invalid input is 400 invalid before anything is written", async () => {
    const { jar } = await t.owner("invalid")
    for (const body of [{}, { name: "  " }, { name: "x".repeat(121) }]) expect([(await create(jar, body)).status, body]).toEqual([400, body])
    expect(await list(jar)).toEqual([])
  })

  test("a project of another workspace is 404 for read, update and delete, and never listed", async () => {
    const theirs = await t.owner("theirs")
    const p = (await (await create(theirs.jar, { name: "Secret" })).json()) as Project
    const { jar } = await t.owner("intruder")
    for (const [method, body] of [["GET"], ["PATCH", { name: "Taken" }], ["DELETE"]] as const) {
      const res = await t.call(`/api/projects/${p.id}`, { method, cookie: jar, body })
      expect([method, res.status, await res.json()]).toEqual([method, 404, { error: "not_found" }])
    }
    expect(await list(jar)).toEqual([])
    expect((await list(theirs.jar)).map((x) => x.name)).toEqual(["Secret"])
    expect((await t.call("/api/projects/not-a-uuid", { cookie: jar })).status).toBe(404)
  })

  test("the plan's project limit: the 4th project on Starter is 402 upgrade_required with used and limit", async () => {
    const { jar } = await t.owner("limit", "starter")
    for (let i = 0; i < 3; i++) expect((await create(jar, { name: `p${i}` })).status).toBe(201)
    const refused = await create(jar, { name: "one too many" })
    expect([refused.status, await refused.json()]).toEqual([402, { error: "upgrade_required", reason: "projects", used: 3, limit: 3 }])
    expect(await list(jar)).toHaveLength(3)
  })

  test("concurrent creates never exceed the limit", async () => {
    const { jar } = await t.owner("race", "starter")
    const statuses = (await Promise.all(Array.from({ length: 6 }, (_, i) => create(jar, { name: `r${i}` })))).map((r) => r.status).sort()
    expect(statuses).toEqual([201, 201, 201, 402, 402, 402])
    expect(await list(jar)).toHaveLength(3)
  })

  test("business has no project limit", async () => {
    const { jar } = await t.owner("unlimited", "business")
    for (let i = 0; i < 30; i++) expect((await create(jar, { name: `b${i}` })).status).toBe(201)
  })

  test("export is a CSV on plans with the export feature, 402 on Starter", async () => {
    const pro = await t.owner("export-pro", "pro")
    await create(pro.jar, { name: 'Say "hi", world', description: "line" })
    const res = await t.call("/api/projects/export", { cookie: pro.jar })
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8")
    const [header, row] = (await res.text()).split("\r\n")
    expect(header).toBe('"name","description","created_at"')
    expect(row).toMatch(/^"Say ""hi"", world","line","\d{4}-/)
    const starter = await t.owner("export-starter", "starter")
    const refused = await t.call("/api/projects/export", { cookie: starter.jar })
    expect([refused.status, await refused.json()]).toEqual([402, { error: "upgrade_required", reason: "export" }])
  })

  test("without a live subscription every projects route is 402 subscription_inactive", async () => {
    const { jar, orgId } = await t.owner("inactive")
    await t.db.update(subscriptions).set({ status: "ended" }).where(eq(subscriptions.organizationId, orgId))
    for (const res of [await t.call("/api/projects", { cookie: jar }), await create(jar, { name: "x" })]) expect([res.status, await res.json()]).toEqual([402, { error: "upgrade_required", reason: "subscription_inactive" }])
  })
})
