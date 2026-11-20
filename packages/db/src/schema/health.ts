import { pgTable, text } from "drizzle-orm/pg-core"

// Read-after-write probe row for /api/health (proves reads see fresh writes).
export const healthProbe = pgTable("health_probe", {
  id: text("id").primaryKey(),
  value: text("value").notNull(),
})
