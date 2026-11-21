import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core"

// Fixed-window counters shared by every Worker instance, keyed by user or hashed IP.
export const rateLimits = pgTable(
  "rate_limits",
  {
    subject: text("subject").notNull(),
    // Free text: each limited action names its own bucket, e.g. "invite" or "upload".
    bucket: text("bucket").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull(),
  },
  (t) => [primaryKey({ columns: [t.subject, t.bucket, t.windowStart] })],
)
