import { sql } from "drizzle-orm"
import { index, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { user } from "./auth"

const tz = (name: string) => timestamp(name, { withTimezone: true })

export const foods = pgTable(
  "foods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // null = system food (seeded); non-null = custom food owned by this user.
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    preparationState: text("preparation_state").notNull().$type<"raw" | "cooked" | "drained">(),
    caloriesPer100g: real("calories_per_100g").notNull(),
    proteinPer100g: real("protein_per_100g").notNull(),
    carbsPer100g: real("carbs_per_100g").notNull(),
    fatPer100g: real("fat_per_100g").notNull(),
    createdAt: tz("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("foods_user_id_idx").on(t.userId),
    sql`CONSTRAINT "foods_preparation_state_check" CHECK (${t.preparationState} in ('raw', 'cooked', 'drained'))`,
  ],
)

export const mealEntries = pgTable(
  "meal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    slot: text("slot").notNull().$type<"breakfast" | "lunch" | "dinner" | "snack_1" | "snack_2">(),
    foodId: uuid("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    weightG: real("weight_g").notNull(),
    createdAt: tz("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("meal_entries_user_date_idx").on(t.userId, t.date),
    sql`CONSTRAINT "meal_entries_slot_check" CHECK (${t.slot} in ('breakfast', 'lunch', 'dinner', 'snack_1', 'snack_2'))`,
    sql`CONSTRAINT "meal_entries_weight_check" CHECK (${t.weightG} > 0)`,
  ],
)
