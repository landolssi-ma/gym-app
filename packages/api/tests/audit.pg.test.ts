import { afterAll, describe, expect, test } from "vitest"

import { auditLogs, eq, organization } from "@workspace/db"
import { TEST_PG_URL } from "@workspace/db/testing"

import { writeAudit, type AuditActor } from "../src/audit"
import { createPgApp } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("audit writer against real Postgres", () => {
  const t = TEST_PG_URL ? createPgApp() : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  const actor: AuditActor = { actorId: "u_actor", impersonatorId: null, ip: "203.0.113.9" }
  const entries = (orgId: string) => t.db.select().from(auditLogs).where(eq(auditLogs.organizationId, orgId))
  const nameOf = async (orgId: string) => (await t.db.select({ name: organization.name }).from(organization).where(eq(organization.id, orgId)))[0]!.name

  async function workspace() {
    const jar = await t.signIn(t.email("audit"))
    const orgId = ((await (await t.call("/api/organizations", { cookie: jar })).json()) as { activeId: string }).activeId
    return { orgId, name: await nameOf(orgId) }
  }
  // The action under test: a rename and its entry in one transaction.
  const rename = (orgId: string, metadata: Record<string, unknown>, after?: () => void) =>
    t.db.transaction(async (tx) => {
      await tx.update(organization).set({ name: "Renamed" }).where(eq(organization.id, orgId))
      await writeAudit(tx, actor, { organizationId: orgId, action: "workspace.created", targetType: "workspace", targetId: orgId, metadata })
      after?.()
    })

  test("an entry commits with its action and holds every field", async () => {
    const { orgId } = await workspace()
    await rename(orgId, { from: "a", to: "b" })
    expect(await nameOf(orgId)).toBe("Renamed")
    const [e] = await entries(orgId)
    expect(e).toMatchObject({ organizationId: orgId, actorId: "u_actor", impersonatorId: null, action: "workspace.created", targetType: "workspace", targetId: orgId, ip: "203.0.113.9", metadata: { from: "a", to: "b" } })
    expect(e!.createdAt).toBeInstanceOf(Date)
  })

  test.each([["password"], ["resetToken"], ["code"], ["cardNumber"], ["nested.apiKey"]])("a failed write fails the action: metadata key %s is refused and nothing is stored", async (key) => {
    const { orgId, name } = await workspace()
    const metadata = key.startsWith("nested.") ? { nested: { [key.slice(7)]: "x" } } : { [key]: "x" }
    await expect(rename(orgId, metadata)).rejects.toThrow(/looks like a secret/)
    expect(await nameOf(orgId)).toBe(name)
    expect(await entries(orgId)).toEqual([])
  })

  test("an action aborted after its entry was written leaves no entry", async () => {
    const { orgId, name } = await workspace()
    await expect(rename(orgId, {}, () => { throw new Error("role change failed") })).rejects.toThrow("role change failed")
    expect(await nameOf(orgId)).toBe(name)
    expect(await entries(orgId)).toEqual([])
  })

  test("entries go when their workspace is purged", async () => {
    const { orgId } = await workspace()
    await rename(orgId, {})
    await t.db.delete(organization).where(eq(organization.id, orgId))
    expect(await entries(orgId)).toEqual([])
  })
})
