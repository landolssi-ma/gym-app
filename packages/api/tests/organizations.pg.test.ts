import { afterAll, describe, expect, test, vi } from "vitest"

import { eq, session, user } from "@workspace/db"
import { TEST_PG_URL } from "@workspace/db/testing"

import { createPgApp } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("workspace routes against real Postgres", () => {
  const sent = vi.fn(async () => {})
  const t = TEST_PG_URL ? createPgApp({ jobs: { send: sent, define: () => ({}), serve: () => async () => new Response() } as never }) : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  type List = { organizations: { id: string; name: string; role: string; noTrial: boolean }[]; activeId: string }
  const list = async (cookie: string) => (await (await t.call("/api/organizations", { cookie })).json()) as List

  test("create: the creator is owner, it is active and last used, not trial-eligible, and organization.created is emitted", async () => {
    const email = t.email("create")
    const jar = await t.signIn(email)
    const res = await t.call("/api/organizations", { method: "POST", body: { name: "Acme" }, cookie: jar })
    expect(res.status).toBe(201)
    const created = (await res.json()) as { id: string; role: string; noTrial: boolean }
    expect(created).toMatchObject({ role: "owner", noTrial: true })
    const after = await list(jar)
    expect(after.activeId).toBe(created.id)
    expect(after.organizations.map((o) => o.name)).toContain("Acme")
    expect(sent).toHaveBeenCalledWith("organization.created", { organizationId: created.id }, `organization.created:${created.id}`)
    const [u] = await t.db.select({ last: user.lastActiveOrganizationId }).from(user).where(eq(user.email, email))
    expect(u?.last).toBe(created.id)
  })

  test("an empty name is 400 invalid", async () => {
    const jar = await t.signIn(t.email("blank"))
    expect((await t.call("/api/organizations", { method: "POST", body: { name: "  " }, cookie: jar })).status).toBe(400)
  })

  test("switch changes the session's workspace; a new session starts in the last used one", async () => {
    const email = t.email("switch")
    const jar = await t.signIn(email)
    const personal = (await list(jar)).activeId
    const acme = ((await (await t.call("/api/organizations", { method: "POST", body: { name: "Acme" }, cookie: jar })).json()) as { id: string }).id
    expect((await t.call(`/api/organizations/${personal}/switch`, { method: "POST", cookie: jar })).status).toBe(200)
    expect((await list(jar)).activeId).toBe(personal)
    await t.call(`/api/organizations/${acme}/switch`, { method: "POST", cookie: jar })
    const fresh = await t.signIn(email)
    expect((await list(fresh)).activeId).toBe(acme)
  })

  test("switching to a workspace the user is not a member of is 404 and changes nothing", async () => {
    const other = await t.signIn(t.email("other"))
    const theirs = (await list(other)).activeId
    const jar = await t.signIn(t.email("intruder"))
    const before = (await list(jar)).activeId
    expect((await t.call(`/api/organizations/${theirs}/switch`, { method: "POST", cookie: jar })).status).toBe(404)
    expect((await list(jar)).activeId).toBe(before)
    expect(await t.db.select().from(session).where(eq(session.activeOrganizationId, theirs))).toHaveLength(1)
  })

  test("owner and admins rename the workspace; members cannot; an empty name is refused", async () => {
    const { jar } = await t.owner("rename")
    expect((await t.call("/api/organizations/current", { method: "PATCH", body: { name: "Renamed" }, cookie: jar })).status).toBe(200)
    expect(((await (await t.call("/api/me", { cookie: jar })).json()) as { activeOrganization: { name: string } }).activeOrganization.name).toBe("Renamed")
    expect((await t.call("/api/organizations/current", { method: "PATCH", body: { name: " " }, cookie: jar })).status).toBe(400)
    const memberEmail = t.email("m")
    const { id } = (await (await t.call("/api/team/invites", { method: "POST", body: { email: memberEmail }, cookie: jar })).json()) as { id: string }
    const memberJar = await t.signIn(memberEmail)
    await t.call(`/api/team/invites/${id}/accept`, { method: "POST", cookie: memberJar })
    expect((await t.call("/api/organizations/current", { method: "PATCH", body: { name: "Mine" }, cookie: memberJar })).status).toBe(403)
  })
})
