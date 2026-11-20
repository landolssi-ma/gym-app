import { afterAll, describe, expect, test } from "vitest"

import { createTestDb, TEST_PG_URL } from "@workspace/db/testing"

import { createApi } from "../src/index"
import { APP, fakeDeps } from "./helpers/fake-deps"

describe.skipIf(!TEST_PG_URL)("health route against real Postgres", () => {
  const { db, end } = TEST_PG_URL ? createTestDb() : ({} as ReturnType<typeof createTestDb>)
  afterAll(() => end?.())

  test("with the token, confirms the read returned the value just written", async () => {
    const app = createApi(() => fakeDeps({ db }))
    const res = await app.request(`${APP}/api/health`, { headers: { "x-smoke-token": "test-smoke-token-0001" } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ db: true, fresh: true })
  })
})
