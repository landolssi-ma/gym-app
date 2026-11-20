import { afterAll, describe, expect, test } from "vitest"

import { member, organization, sql, user } from "../src"
import { createTestDb, TEST_PG_URL } from "../src/testing"

describe.skipIf(!TEST_PG_URL)("auth schema against real Postgres", () => {
  const { db, end } = TEST_PG_URL ? createTestDb() : ({} as ReturnType<typeof createTestDb>)
  afterAll(() => end?.())

  test("every timestamp column is timestamptz", async () => {
    const { rows } = await db.execute<{ table_name: string; column_name: string }>(
      sql`select table_name, column_name from information_schema.columns where table_schema = 'public' and data_type = 'timestamp without time zone'`,
    )
    expect(rows).toEqual([])
  })

  test("a workspace cannot have two owners, and roles are owner, admin or member", async () => {
    const id = crypto.randomUUID()
    await db.insert(organization).values({ id, name: "Two owners", slug: id, createdAt: new Date() })
    for (const u of ["a", "b"]) await db.insert(user).values({ id: `${id}-${u}`, name: u, email: `${id}-${u}@test` })
    await db.insert(member).values({ id: `${id}-m1`, organizationId: id, userId: `${id}-a`, role: "owner", createdAt: new Date() })
    await expect(db.insert(member).values({ id: `${id}-m2`, organizationId: id, userId: `${id}-b`, role: "owner", createdAt: new Date() })).rejects.toThrow()
    await db.insert(member).values({ id: `${id}-m2`, organizationId: id, userId: `${id}-b`, role: "admin", createdAt: new Date() })
    await expect(db.update(member).set({ role: "superuser" }).where(sql`${member.id} = ${`${id}-m2`}`)).rejects.toThrow()
  })

  test("a user's platform role is user or admin only", async () => {
    await expect(db.insert(user).values({ id: crypto.randomUUID(), name: "x", email: `${crypto.randomUUID()}@test`, role: "owner" })).rejects.toThrow()
  })
})
