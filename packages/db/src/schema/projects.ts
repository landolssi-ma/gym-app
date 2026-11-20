import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { organization, user } from "./auth"

const tz = (name: string) => timestamp(name, { withTimezone: true })

// The reference module: a minimal workspace-owned resource showing every convention end to end.
// Copy it for a product feature, then delete it (docs/recipes/add-a-module.md).
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [index("projects_organization_id_idx").on(t.organizationId, t.createdAt)],
)
