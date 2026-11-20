import { afterAll, describe, expect, test, vi } from "vitest"

import { createJobs } from "@workspace/jobs"
import { eq, member, organization, sql, user } from "@workspace/db"
import { TEST_PG_URL } from "@workspace/db/testing"

import { purgeOrganizationsFunction } from "../src/jobs/purge-organizations"
import { testBilling, webhook } from "./helpers/billing"
import { createPgApp } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("account and workspace deletion against real Postgres", () => {
  const sent = vi.fn(async () => {})
  const cancelImmediately = vi.fn(async () => {})
  const t = TEST_PG_URL ? createPgApp({ jobs: { send: sent, define: () => ({}), serve: () => async () => new Response() } as never, billing: testBilling({ cancelImmediately }) }) : ({} as ReturnType<typeof createPgApp>)
  const subscribe = (orgId: string) => {
    const w = webhook({ type: "subscription.renewed", organizationId: orgId })
    return t.app.request("https://app.test/api/webhooks/billing", { method: "POST", headers: w.headers, body: w.body })
  }
  afterAll(() => t.end?.())
  const post = (path: string, cookie: string, body: unknown = {}) => t.call(path, { method: "POST", body, cookie })
  const active = async (cookie: string) => ((await (await t.call("/api/organizations", { cookie })).json()) as { activeId: string; organizations: { id: string; name: string }[] })

  async function sharedWorkspace() {
    const ownerEmail = t.email("owner")
    const owner = await t.signIn(ownerEmail)
    const acme = (await (await post("/api/organizations", owner, { name: "Acme" })).json()) as { id: string }
    await t.subscribe(acme.id)
    const memberEmail = t.email("member")
    const { id } = (await (await post("/api/team/invites", owner, { email: memberEmail })).json()) as { id: string }
    const joined = await t.signIn(memberEmail)
    await post(`/api/team/invites/${id}/accept`, joined)
    return { owner, ownerEmail, joined, orgId: acme.id }
  }

  test("deleting a workspace needs its exact name", async () => {
    const owner = await t.signIn(t.email("o"))
    const res = await post("/api/organizations/current/delete", owner, { confirm: "wrong name" })
    expect([res.status, await res.json()]).toEqual([400, { error: "confirm_mismatch" }])
  })

  test("a deleted workspace is unreachable at once, members move elsewhere, and organization.deleted is emitted", async () => {
    const { owner, joined, orgId } = await sharedWorkspace()
    expect((await active(joined)).activeId).toBe(orgId)
    expect((await post("/api/organizations/current/delete", owner, { confirm: "Acme" })).status).toBe(200)
    expect((await active(owner)).organizations.map((o) => o.id)).not.toContain(orgId)
    const after = await active(joined)
    expect(after.activeId).not.toBe(orgId)
    expect(after.activeId).toBeTruthy()
    expect(sent).toHaveBeenCalledWith("organization.deleted", { organizationId: orgId }, `organization.deleted:${orgId}`)
  })

  test("only the owner can delete the workspace", async () => {
    const { joined } = await sharedWorkspace()
    expect((await post("/api/organizations/current/delete", joined, { confirm: "Acme" })).status).toBe(403)
  })

  test("the purge removes workspaces deleted more than 30 days ago, and only those", async () => {
    const { owner, orgId } = await sharedWorkspace()
    await post("/api/organizations/current/delete", owner, { confirm: "Acme" })
    const recent = (await (await post("/api/organizations", owner, { name: "Recent" })).json()) as { id: string }
    await post("/api/organizations/current/delete", owner, { confirm: "Recent" })
    await t.db.update(organization).set({ deletedAt: sql`now() - interval '31 days'` }).where(eq(organization.id, orgId))
    const fn = purgeOrganizationsFunction({ ...t.deps, jobs: createJobs({ appId: "t", eventKey: "k", signingKey: "s", isDev: true }) })
    await fn["fn"]({ step: { run: async (_n: string, cb: () => unknown) => cb() } } as never)
    expect(await t.db.select().from(organization).where(eq(organization.id, orgId))).toEqual([])
    expect(await t.db.select().from(member).where(eq(member.organizationId, orgId))).toEqual([])
    expect(await t.db.select().from(organization).where(eq(organization.id, recent.id))).toHaveLength(1)
  })

  test("account deletion: wrong confirmation is 400 confirm_mismatch", async () => {
    const jar = await t.signIn(t.email("acct"))
    expect(await (await post("/api/account/delete", jar, { confirm: "nope" })).json()).toEqual({ error: "confirm_mismatch" })
  })

  test("account deletion is refused while the user owns a workspace with other members", async () => {
    const { owner, ownerEmail, orgId } = await sharedWorkspace()
    const res = await post("/api/account/delete", owner, { confirm: ownerEmail })
    expect([res.status, await res.json()]).toEqual([409, { error: "owns_organization_with_members" }])
    expect(await t.db.select().from(user).where(eq(user.email, ownerEmail))).toHaveLength(1)
    expect((await t.db.select({ deletedAt: organization.deletedAt }).from(organization).where(eq(organization.id, orgId)))[0]!.deletedAt).toBeNull()
  })

  test("account deletion signs out everywhere, removes the account and deletes the workspaces it owned", async () => {
    const email = t.email("leaving")
    const a = await t.signIn(email)
    const b = await t.signIn(email)
    const personal = (await active(a)).activeId
    expect((await post("/api/account/delete", a, { confirm: email })).status).toBe(200)
    expect((await t.call("/api/organizations", { cookie: a })).status).toBe(401)
    expect((await t.call("/api/organizations", { cookie: b })).status).toBe(401)
    expect(await t.db.select().from(user).where(eq(user.email, email))).toEqual([])
    expect((await t.db.select({ deletedAt: organization.deletedAt }).from(organization).where(eq(organization.id, personal)))[0]!.deletedAt).toBeInstanceOf(Date)
  })

  test("deleting a workspace cancels its subscription with the provider; deleting an account does too", async () => {
    const owner = await t.signIn(t.email("payer"))
    const acme = ((await (await post("/api/organizations", owner, { name: "Paid" })).json()) as { id: string }).id
    await subscribe(acme)
    cancelImmediately.mockClear()
    await post("/api/organizations/current/delete", owner, { confirm: "Paid" })
    expect(cancelImmediately).toHaveBeenCalledWith(`sub_sim_${acme}`)

    const email = t.email("leaver")
    const jar = await t.signIn(email)
    const personal = (await active(jar)).activeId
    await subscribe(personal)
    cancelImmediately.mockClear()
    await post("/api/account/delete", jar, { confirm: email })
    expect(cancelImmediately).toHaveBeenCalledWith(`sub_sim_${personal}`)
  })

  test("a provider failure on cancel does not block the deletion", async () => {
    const owner = await t.signIn(t.email("payer2"))
    const acme = ((await (await post("/api/organizations", owner, { name: "Paid2" })).json()) as { id: string }).id
    await subscribe(acme)
    cancelImmediately.mockRejectedValueOnce(new Error("provider down"))
    expect((await post("/api/organizations/current/delete", owner, { confirm: "Paid2" })).status).toBe(200)
    expect((await active(owner)).organizations.map((o) => o.id)).not.toContain(acme)
  })
})
