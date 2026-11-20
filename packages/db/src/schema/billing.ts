import { boolean, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"

import { organization } from "./auth"

const tz = (name: string) => timestamp(name, { withTimezone: true })
const organizationId = () =>
  text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" })

// One per workspace. Only the billing webhook writes it; routes read it.
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: organizationId(),
    providerSubscriptionId: text("provider_subscription_id").notNull(),
    providerCustomerId: text("provider_customer_id"),
    plan: text("plan").notNull(),
    interval: text("interval").$type<"month" | "year">().notNull(),
    status: text("status").$type<"trialing" | "active" | "past_due" | "canceled" | "ended">().notNull(),
    trialEndsAt: tz("trial_ends_at"),
    currentPeriodStart: tz("current_period_start").notNull(),
    currentPeriodEnd: tz("current_period_end").notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    pendingPlan: text("pending_plan"),
    // Set when the trial reminder is sent, so a rerun of the daily job sends nothing.
    trialReminderSentAt: tz("trial_reminder_sent_at"),
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("subscriptions_organization_id_idx").on(t.organizationId), uniqueIndex("subscriptions_provider_subscription_id_idx").on(t.providerSubscriptionId)],
)

// Usage meters: one row per workspace, meter and billing period.
export const usage = pgTable(
  "usage",
  {
    organizationId: organizationId(),
    meter: text("meter").notNull(),
    periodStart: tz("period_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.meter, t.periodStart] })],
)

// Billing webhook ids already applied: a replayed delivery is acknowledged and ignored.
export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  createdAt: tz("created_at").notNull().defaultNow(),
})
