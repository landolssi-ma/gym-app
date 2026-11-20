import { and, eq, gte, isNull, lt, member, sql, subscriptions, user } from "@workspace/db"

import type { Deps } from "../index"

// Once a day, the owner of each workspace whose trial ends in 6 to 7 days gets one reminder. The
// [6, 7) day window means a daily run never skips a trial whatever time it fires; claiming
// trial_reminder_sent_at before sending means a second run never sends a second one.
export function trialRemindersFunction(deps: Deps) {
  return deps.jobs.define({ id: "send-trial-reminders", triggers: [{ cron: "0 8 * * *" }], retries: 2 }, async ({ step }) => {
    const due = await step.run("query-ending-trials", () =>
      deps.db
        .select({ organizationId: subscriptions.organizationId })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.status, "trialing"),
            isNull(subscriptions.trialReminderSentAt),
            gte(subscriptions.trialEndsAt, sql`now() + interval '6 days'`),
            lt(subscriptions.trialEndsAt, sql`now() + interval '7 days'`),
          ),
        ),
    )
    for (const { organizationId } of due) {
      await step.run(`remind-${organizationId}`, async () => {
        const [claimed] = await deps.db
          .update(subscriptions)
          .set({ trialReminderSentAt: new Date() })
          .where(and(eq(subscriptions.organizationId, organizationId), isNull(subscriptions.trialReminderSentAt)))
          .returning({ trialEndsAt: subscriptions.trialEndsAt })
        if (!claimed?.trialEndsAt) return
        const [owner] = await deps.db
          .select({ email: user.email })
          .from(member)
          .innerJoin(user, eq(user.id, member.userId))
          .where(and(eq(member.organizationId, organizationId), eq(member.role, "owner")))
        if (owner) await deps.mail.send("trialReminder", owner.email, { trialEndsAt: claimed.trialEndsAt, cancelUrl: `${deps.config.appOrigin}/billing?action=cancel` })
      })
    }
    return { reminded: due.length }
  })
}
