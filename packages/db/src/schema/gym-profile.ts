import { sql } from "drizzle-orm"
import { check, integer, pgTable, real, text, timestamp } from "drizzle-orm/pg-core"

import { user } from "./auth"

export const gymProfiles = pgTable(
  "gym_profiles",
  {
    userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
    sex: text("sex").notNull(),
    age: integer("age").notNull(),
    heightCm: real("height_cm").notNull(),
    weightKg: real("weight_kg").notNull(),
    waistCm: real("waist_cm").notNull(),
    hipCm: real("hip_cm"),
    sportLevel: text("sport_level").notNull(),
    goal: text("goal").notNull(),
    sessionsPerWeek: integer("sessions_per_week").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("gym_profiles_sex_check", sql`${table.sex} in ('female', 'male', 'other')`),
    check("gym_profiles_age_check", sql`${table.age} between 13 and 120`),
    check("gym_profiles_height_check", sql`${table.heightCm} between 80 and 250`),
    check("gym_profiles_weight_check", sql`${table.weightKg} between 20 and 500`),
    check("gym_profiles_waist_check", sql`${table.waistCm} between 40 and 300`),
    check("gym_profiles_hip_check", sql`${table.hipCm} is null or ${table.hipCm} between 40 and 300`),
    check("gym_profiles_level_check", sql`${table.sportLevel} in ('beginner', 'intermediate', 'advanced')`),
    check("gym_profiles_goal_check", sql`${table.goal} in ('muscle_gain', 'fat_loss', 'weight_loss', 'maintenance', 'body_recomposition')`),
    check("gym_profiles_sessions_check", sql`${table.sessionsPerWeek} between 1 and 7`),
  ],
)
