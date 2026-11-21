import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

// The audit trail of security actions. Written in the transaction of the action it
// records; no route edits or deletes a row. organization_id is null for platform-wide actions (a
// ban), and the row goes when its workspace is purged. Actor ids are plain text, not foreign keys,
// so the history outlives a deleted account.
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id").notNull(),
    // The platform admin acting as actorId, when the action was taken while impersonating.
    impersonatorId: text("impersonator_id"),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_actor_id_idx").on(t.actorId, t.createdAt), index("audit_logs_created_at_idx").on(t.createdAt)],
)
