import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { user } from "./auth"

const tz = (name: string) => timestamp(name, { withTimezone: true })

// The reference module: a minimal account-owned resource showing every convention end to end.
// Copy it for a product feature, then delete it (docs/recipes/add-a-module.md).
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [index("projects_user_id_idx").on(t.userId, t.createdAt)],
)
