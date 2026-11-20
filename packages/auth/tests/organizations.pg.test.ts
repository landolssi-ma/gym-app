import { afterAll, describe, expect, test } from "vitest"

import { eq, member, organization, user } from "@workspace/db"
import { createTestDb, TEST_PG_URL } from "@workspace/db/testing"

import { createOrganization, ensurePersonalOrganization, listMemberOrganizations, markOrganizationDeleted, resolveActiveOrganization } from "../src/organizations"

// A fake DB cannot prove the FOR UPDATE lock or real constraints, so this runs on real Postgres.
describe.skipIf(!TEST_PG_URL)("workspaces against real Postgres", () => {
  const { db, end } = TEST_PG_URL ? createTestDb() : ({} as ReturnType<typeof createTestDb>)
  afterAll(() => end?.())

  async function insertPerson(name = "Ada Lovelace") {
    const id = crypto.randomUUID()
    const email = `${id}@test.invalid`
    await db.insert(user).values({ id, name, email })
    return { id, name, email }
  }

  test("ensurePersonalOrganization twice returns the same workspace, one owner membership, set as last used", async () => {
    const person = await insertPerson()
    const first = await ensurePersonalOrganization(db, person)
    const second = await ensurePersonalOrganization(db, person)
    expect(second.id).toBe(first.id)
    expect(first).toMatchObject({ name: "Ada's workspace", role: "owner", noTrial: false })
    expect(await db.select().from(member).where(eq(member.userId, person.id))).toHaveLength(1)
    const [row] = await db.select({ last: user.lastActiveOrganizationId }).from(user).where(eq(user.id, person.id))
    expect(row?.last).toBe(first.id)
  })

  test("two concurrent first sessions create exactly one workspace", async () => {
    const person = await insertPerson()
    const other = createTestDb()
    try {
      const [a, b] = await Promise.all([ensurePersonalOrganization(db, person), ensurePersonalOrganization(other.db, person)])
      expect(a.id).toBe(b.id)
      expect(await db.select().from(member).where(eq(member.userId, person.id))).toHaveLength(1)
    } finally {
      await other.end()
    }
  })

  test("only a person's first workspace ever is trial-eligible", async () => {
    const person = await insertPerson()
    const first = await ensurePersonalOrganization(db, person)
    const created = await createOrganization(db, person, "Acme")
    expect([first.noTrial, created.noTrial]).toEqual([false, true])
    // Left every workspace: the replacement personal workspace is not eligible either.
    await db.delete(member).where(eq(member.userId, person.id))
    expect((await ensurePersonalOrganization(db, person)).noTrial).toBe(true)
  })

  test("a created workspace has the creator as owner and becomes last used", async () => {
    const person = await insertPerson()
    const created = await createOrganization(db, person, "Acme")
    expect(created).toMatchObject({ name: "Acme", role: "owner" })
    const [row] = await db.select({ last: user.lastActiveOrganizationId }).from(user).where(eq(user.id, person.id))
    expect(row?.last).toBe(created.id)
  })

  test("resolveActiveOrganization: the preferred workspace if still a member, else the oldest owned one", async () => {
    const person = await insertPerson()
    const a = await createOrganization(db, person, "A")
    const b = await createOrganization(db, person, "B")
    expect((await resolveActiveOrganization(db, person.id, b.id))?.id).toBe(b.id)
    await db.update(member).set({ createdAt: new Date("2026-01-01T00:00:00Z") }).where(eq(member.userId, person.id))
    expect((await resolveActiveOrganization(db, person.id, "not-a-member"))?.id).toBe([a.id, b.id].sort()[0])
  })

  test("a deleted workspace is hidden from the list and the fallback while its membership survives", async () => {
    const person = await insertPerson()
    const first = await createOrganization(db, person, "First")
    const second = await createOrganization(db, person, "Second")
    await markOrganizationDeleted(db, first.id)
    const [deleted] = await db.select({ deletedAt: organization.deletedAt }).from(organization).where(eq(organization.id, first.id))
    expect(deleted?.deletedAt).toBeInstanceOf(Date)
    expect((await listMemberOrganizations(db, person.id)).map((o) => o.id)).toEqual([second.id])
    expect((await resolveActiveOrganization(db, person.id, first.id))?.id).toBe(second.id)
    expect(await db.select({ id: member.id }).from(member).where(eq(member.organizationId, first.id))).toHaveLength(1)
  })
})
