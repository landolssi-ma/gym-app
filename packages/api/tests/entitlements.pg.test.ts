import { afterAll, afterEach, describe, expect, test } from "vitest"

import { PLANS } from "@workspace/billing"
import { eq, member, subscriptions } from "@workspace/db"
import { TEST_PG_URL } from "@workspace/db/testing"

import { useMeter } from "../src/entitlements"
import { loadSubscription } from "../src/subscriptions"
import { createPgApp } from "./helpers/pg-app"

// Test-only allowances, restored after each test: the starter defines no meters by default.
const plans = PLANS as unknown as Record<string, { meters: Record<string, number>; limits: { seats: number | null } }>
afterEach(() => {
  delete plans.pro!.meters.exports
  plans.pro!.limits.seats = 5
})

describe.skipIf(!TEST_PG_URL)("entitlements against real Postgres", () => {
  const t = TEST_PG_URL ? createPgApp() : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  const invite = (jar: string, email = t.email("invitee")) => t.call("/api/team/invites", { method: "POST", body: { email }, cookie: jar })

  test("over the seat limit: 402 upgrade_required with reason seats, used and limit", async () => {
    const { jar } = await t.owner("full", "starter")
    const res = await invite(jar)
    expect([res.status, await res.json()]).toEqual([402, { error: "upgrade_required", reason: "seats", used: 1, limit: 1 }])
  })

  test("a pending invitation takes a seat; accepting it does not count it twice", async () => {
    plans.pro!.limits.seats = 3
    const { jar, orgId } = await t.owner("three")
    const second = t.email("second")
    await invite(jar, second)
    const lastEmail = t.email("last")
    const last = (await (await invite(jar, lastEmail)).json()) as { id: string }
    expect((await invite(jar)).status).toBe(402)
    for (const [email, id] of [[second, undefined], [lastEmail, last.id]] as const) {
      const inviteId = id ?? (t.links.filter((l) => l.kind === "invite" && l.email === email).at(-1)!.url.split("/").at(-1))
      expect((await t.call(`/api/team/invites/${inviteId}/accept`, { method: "POST", cookie: await t.signIn(email) })).status).toBe(200)
    }
    expect(await t.db.select().from(member).where(eq(member.organizationId, orgId))).toHaveLength(3)
  })

  test("concurrent invitations for the last seat: exactly one succeeds", async () => {
    plans.pro!.limits.seats = 2
    const { jar } = await t.owner("race")
    const results = await Promise.all([invite(jar), invite(jar), invite(jar)])
    expect(results.map((r) => r.status).sort()).toEqual([201, 402, 402])
  })

  test("a workspace without a live subscription cannot invite: 402 subscription_inactive", async () => {
    const jar = await t.signIn(t.email("unpaid"))
    expect(await (await invite(jar)).json()).toEqual({ error: "upgrade_required", reason: "subscription_inactive" })
  })

  test("a lowered limit keeps existing members; only new seats are refused", async () => {
    const { jar, orgId } = await t.owner("lowered")
    const joined = t.email("joined")
    const { id } = (await (await invite(jar, joined)).json()) as { id: string }
    await t.call(`/api/team/invites/${id}/accept`, { method: "POST", cookie: await t.signIn(joined) })
    plans.pro!.limits.seats = 1
    expect(await t.db.select().from(member).where(eq(member.organizationId, orgId))).toHaveLength(2)
    expect((await t.call("/api/team", { cookie: jar })).status).toBe(200)
    expect(await (await invite(jar)).json()).toMatchObject({ reason: "seats", used: 2, limit: 1 })
  })

  test("a meter counts each unit, refuses without counting once used up, and starts again next period", async () => {
    plans.pro!.meters.exports = 2
    const { orgId } = await t.owner("meter")
    const sub = await loadSubscription(t.db, orgId)
    expect(await useMeter(t.db, sub, orgId, "exports")).toBeNull()
    expect(await useMeter(t.db, sub, orgId, "exports")).toBeNull()
    expect(await useMeter(t.db, sub, orgId, "exports")).toEqual({ error: "upgrade_required", reason: "exports", used: 2, limit: 2 })
    expect(await useMeter(t.db, sub, orgId, "exports")).toMatchObject({ used: 2 })
    await t.db.update(subscriptions).set({ currentPeriodStart: new Date(Date.now() + 86_400_000) }).where(eq(subscriptions.organizationId, orgId))
    expect(await useMeter(t.db, await loadSubscription(t.db, orgId), orgId, "exports")).toBeNull()
  })

  test("concurrent meter use at the last unit: exactly one passes", async () => {
    plans.pro!.meters.exports = 1
    const { orgId } = await t.owner("meterrace")
    const sub = await loadSubscription(t.db, orgId)
    const results = await Promise.all([useMeter(t.db, sub, orgId, "exports"), useMeter(t.db, sub, orgId, "exports"), useMeter(t.db, sub, orgId, "exports")])
    expect(results.filter((r) => r === null)).toHaveLength(1)
  })
})
