import { afterAll, describe, expect, test, vi } from "vitest"

import { eq, sql, subscriptions } from "@workspace/db"
import { createJobs } from "@workspace/jobs"
import { TEST_PG_URL } from "@workspace/db/testing"

import { trialRemindersFunction } from "../src/jobs/trial-reminders"
import { testBilling, webhook } from "./helpers/billing"
import { createPgApp } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("trial reminders against real Postgres", () => {
  const mail = { send: vi.fn(async () => {}) }
  const t = TEST_PG_URL ? createPgApp({ billing: testBilling(), mail: mail as never }) : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  const run = () => trialRemindersFunction({ ...t.deps, jobs: createJobs({ appId: "t", eventKey: "k", signingKey: "s", isDev: true }) })["fn"]({ step: { run: async (_n: string, cb: () => unknown) => cb() } } as never)

  async function trialEndingIn(days: number) {
    const email = t.email("trial")
    const jar = await t.signIn(email)
    const orgId = ((await (await t.call("/api/organizations", { cookie: jar })).json()) as { activeId: string }).activeId
    const w = webhook({ type: "subscription.active", organizationId: orgId })
    await t.app.request("https://app.test/api/webhooks/billing", { method: "POST", headers: w.headers, body: w.body })
    await t.db.update(subscriptions).set({ trialEndsAt: sql`now() + make_interval(hours => ${Math.round(days * 24)})` }).where(eq(subscriptions.organizationId, orgId))
    return { email, orgId }
  }

  test("a trial ending in 6.5 days gets one reminder with the end date and a cancel link; a second run sends nothing", async () => {
    const { email } = await trialEndingIn(6.5)
    const far = await trialEndingIn(10)
    const near = await trialEndingIn(3)
    await run()
    expect(mail.send).toHaveBeenCalledWith("trialReminder", email, { trialEndsAt: expect.any(Date), cancelUrl: "https://app.test/billing?action=cancel" })
    const sentTo = mail.send.mock.calls.map((c) => (c as unknown[])[1])
    expect(sentTo).not.toContain(far.email)
    expect(sentTo).not.toContain(near.email)
    mail.send.mockClear()
    await run()
    expect(mail.send.mock.calls.map((c) => (c as unknown[])[1])).not.toContain(email)
  })
})
