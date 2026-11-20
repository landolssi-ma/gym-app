import { afterAll, describe, expect, test } from "vitest"

import { TEST_PG_URL } from "@workspace/db/testing"

import { createPgApp } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("onboarding survey against real Postgres", () => {
  const t = TEST_PG_URL ? createPgApp() : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  const put = (cookie: string, body: unknown) => t.call("/api/me/onboarding", { method: "PUT", body, cookie })
  const onboarding = async (cookie: string) => ((await (await t.call("/api/me", { cookie })).json()) as { onboarding: { answers: Record<string, string>; completedAt?: string } | null }).onboarding

  test("answers are saved one by one; completing stores the answers and a completion time on the workspace", async () => {
    const jar = await t.signIn(t.email("survey"))
    expect(await onboarding(jar)).toBeNull()
    expect((await put(jar, { answers: { role: "founder" } })).status).toBe(200)
    expect((await put(jar, { answers: { teamSize: "2_10" } })).status).toBe(200)
    expect((await put(jar, { answers: {}, complete: true })).status).toBe(200)
    const o = await onboarding(jar)
    expect(o?.answers).toEqual({ role: "founder", teamSize: "2_10" })
    expect(Date.parse(o!.completedAt!)).not.toBeNaN()
  })

  test("completing without a required answer is 400 incomplete and leaves it open", async () => {
    const jar = await t.signIn(t.email("partial"))
    const res = await put(jar, { answers: { role: "developer" }, complete: true })
    expect([res.status, await res.json()]).toEqual([400, { error: "incomplete", missing: ["teamSize"] }])
    expect((await onboarding(jar))?.completedAt).toBeUndefined()
  })

  test("an unknown question or option is 400 invalid", async () => {
    const jar = await t.signIn(t.email("bad"))
    expect((await put(jar, { answers: { role: "astronaut" } })).status).toBe(400)
    expect((await put(jar, { answers: { favoriteColor: "blue" } })).status).toBe(400)
  })

  test("completion time is set once", async () => {
    const jar = await t.signIn(t.email("once"))
    await put(jar, { answers: { role: "founder", teamSize: "1" }, complete: true })
    const first = (await onboarding(jar))!.completedAt
    await put(jar, { answers: { source: "google" }, complete: true })
    expect((await onboarding(jar))!.completedAt).toBe(first)
  })
})
