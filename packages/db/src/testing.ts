import { createDb } from "./index"

// For *.pg.test.ts suites, which run through tests/pg-test.sh. Undefined outside it, so a suite can
// describe.skipIf(!TEST_PG_URL). Refuses any host but 127.0.0.1: tests truncate and rewrite tables.
export const TEST_PG_URL = process.env.TEST_PG_URL

export function createTestDb(): ReturnType<typeof createDb> {
  if (!TEST_PG_URL) throw new Error("TEST_PG_URL is not set: run this suite through packages/db/tests/pg-test.sh")
  if (new URL(TEST_PG_URL).hostname !== "127.0.0.1") throw new Error("refusing to run DB tests against a non-local host")
  return createDb(TEST_PG_URL)
}
