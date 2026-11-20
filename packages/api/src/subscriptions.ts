import type { SubscriptionFields } from "@workspace/billing"
import { eq, subscriptions, type Db } from "@workspace/db"

export type Subscription = SubscriptionFields & { trialReminderSentAt: Date | null }

// The workspace's subscription row, or null when it never subscribed.
export async function loadSubscription(db: Db, orgId: string): Promise<Subscription | null> {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, orgId))
  return (row as unknown as Subscription | undefined) ?? null
}
