import { afterAll, describe, expect, test } from "vitest"

import { eq, healthProbe } from "../src"
import { createTestDb, TEST_PG_URL } from "../src/testing"

describe.skipIf(!TEST_PG_URL)("baseline migration against real Postgres", () => {
  const { db, end } = TEST_PG_URL ? createTestDb() : ({} as ReturnType<typeof createTestDb>)
  afterAll(() => end?.())

  test("the health probe reads back the value just written", async () => {
    const value = crypto.randomUUID()
    await db.insert(healthProbe).values({ id: "probe", value }).onConflictDoUpdate({ target: healthProbe.id, set: { value } })
    const [row] = await db.select().from(healthProbe).where(eq(healthProbe.id, "probe"))
    expect(row?.value).toBe(value)
  })
})
