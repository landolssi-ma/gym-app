import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"

import { user } from "./auth"

const tz = (name: string) => timestamp(name, { withTimezone: true })

// One row per uploaded object. Created pending when the upload is declared; marked ready once the
// object is checked. Abandoned pending rows are removed by the cleanup cron.
export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Random, so it cannot be guessed from the id, name or workspace.
    key: text("key").notNull(),
    name: text("name").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    // What the upload is for (avatar, logo, attachment): decides the confirm step's side effects.
    purpose: text("purpose").notNull(),
    visibility: text("visibility").$type<"private" | "public">().notNull(),
    status: text("status").$type<"pending" | "ready">().notNull().default("pending"),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [index("files_user_id_idx").on(t.userId, t.createdAt), uniqueIndex("files_key_idx").on(t.key), index("files_pending_idx").on(t.status, t.createdAt)],
)
