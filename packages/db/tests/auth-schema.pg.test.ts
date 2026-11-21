import { afterAll, describe, expect, test } from "vitest"

import { sql, user } from "../src"
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

  test("a user's platform role is user or admin only", async () => {
    await expect(db.insert(user).values({ id: crypto.randomUUID(), name: "x", email: `${crypto.randomUUID()}@test`, role: "owner" })).rejects.toThrow()
  })
})
