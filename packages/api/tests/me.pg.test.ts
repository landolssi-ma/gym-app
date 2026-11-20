import { afterAll, describe, expect, test } from "vitest"

import { eq, organization, user } from "@workspace/db"
import { TEST_PG_URL } from "@workspace/db/testing"

import { createPgApp } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("GET /api/me against real Postgres", () => {
  const t = TEST_PG_URL ? createPgApp() : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  const me = async (cookie: string) => (await t.call("/api/me", { cookie })).json() as Promise<Record<string, unknown> & { activeOrganization: { id: string; suspended: boolean } }>

  test("user, active workspace, role, workspaces, plan, features and flags", async () => {
    const { jar, email } = await t.owner("me")
    expect(await me(jar)).toMatchObject({
      user: { email },
      orgRole: "owner",
      subscription: { plan: "pro", status: "active" },
      live: true,
      features: ["export"],
      trialEligible: false,
      isAdmin: false,
      impersonating: false,
      hasPassword: false,
    })
  })

  test("keeps answering for a suspended workspace, and reports it", async () => {
    const { jar, orgId } = await t.owner("susp")
    await t.db.update(organization).set({ suspended: true }).where(eq(organization.id, orgId))
    expect((await me(jar)).activeOrganization.suspended).toBe(true)
  })

  test("isAdmin is read fresh from the database", async () => {
    const email = t.email("admin")
    const jar = await t.signIn(email)
    expect((await me(jar)).isAdmin).toBe(false)
    await t.db.update(user).set({ role: "admin" }).where(eq(user.email, email))
    expect((await me(jar)).isAdmin).toBe(true)
  })
})
