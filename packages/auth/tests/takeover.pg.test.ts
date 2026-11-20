import { afterAll, describe, expect, test } from "vitest"

import { account, eq, user } from "@workspace/db"
import { createTestDb, TEST_PG_URL } from "@workspace/db/testing"

import { createBetterAuth, type AuthConfig } from "../src/better-auth"

describe.skipIf(!TEST_PG_URL)("pre-account-takeover protection against real Postgres", () => {
  const { db, end } = TEST_PG_URL ? createTestDb() : ({} as ReturnType<typeof createTestDb>)
  afterAll(() => end?.())
  const verified: string[] = []
  const cfg = (): AuthConfig => ({
    db,
    secret: "x".repeat(32),
    appOrigin: "https://app.test",
    cookiePrefix: "__Host-acme",
    waitUntil: (p) => void p,
    google: { clientId: "c", clientSecret: "s" },
    sendSignInCode: async () => {},
    sendVerificationEmail: async () => {},
    sendPasswordReset: async () => {},
    onUserVerified: async ({ id }) => void verified.push(id),
  })

  async function unverifiedWithPassword(email: string) {
    const id = crypto.randomUUID()
    await db.insert(user).values({ id, name: "x", email, emailVerified: false })
    await db.insert(account).values({ id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: "pbkdf2$1$00$00", updatedAt: new Date() })
    return id
  }

  // linkAccount is the call Better Auth's Google callback makes when the email matches an existing user.
  test("linking Google to an unverified account drops the password someone else set", async () => {
    const id = await unverifiedWithPassword(`g-${crypto.randomUUID()}@test.invalid`)
    const ctx = await createBetterAuth(cfg()).$context
    await ctx.internalAdapter.linkAccount({ providerId: "google", accountId: `sub-${id}`, userId: id })
    const left = await db.select({ providerId: account.providerId }).from(account).where(eq(account.userId, id))
    expect(left).toEqual([{ providerId: "google" }])
  })

  test("linking Google to a verified account keeps its password", async () => {
    const id = await unverifiedWithPassword(`v-${crypto.randomUUID()}@test.invalid`)
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, id))
    const ctx = await createBetterAuth(cfg()).$context
    await ctx.internalAdapter.linkAccount({ providerId: "google", accountId: `sub-${id}`, userId: id })
    const left = await db.select({ providerId: account.providerId }).from(account).where(eq(account.userId, id))
    expect(left.map((a) => a.providerId).sort()).toEqual(["credential", "google"])
  })

  test("the first verification announces the user exactly once", async () => {
    const id = await unverifiedWithPassword(`a-${crypto.randomUUID()}@test.invalid`)
    const ctx = await createBetterAuth(cfg()).$context
    await ctx.internalAdapter.updateUser(id, { emailVerified: true })
    await ctx.internalAdapter.updateUser(id, { name: "renamed" })
    await ctx.internalAdapter.updateUser(id, { emailVerified: true })
    expect(verified.filter((v) => v === id)).toHaveLength(1)
  })
})
