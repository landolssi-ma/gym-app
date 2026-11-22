import { Hono } from "hono"

import { eq, gymProfiles } from "@workspace/db"

import { requireUser, type GuardEnv } from "../../guards"

// Activity multipliers for TDEE (Mifflin–St Jeor standard values).
const ACTIVITY: Record<string, number> = {
  beginner: 1.375,     // light exercise 1-3 days
  intermediate: 1.55,  // moderate exercise 3-5 days
  advanced: 1.725,     // hard exercise 6-7 days
}

// Caloric adjustment from TDEE by goal (kcal/day).
const GOAL_DELTA: Record<string, number> = {
  muscle_gain: 300,
  fat_loss: -500,
  weight_loss: -500,
  maintenance: 0,
  body_recomposition: -200,
}

export const needs = new Hono<GuardEnv>()
  .use(requireUser)
  .get("/", async (c) => {
    const [profile] = await c.var.deps.db.select().from(gymProfiles).where(eq(gymProfiles.userId, c.var.userId)).limit(1)
    if (!profile) return c.json({ error: "not_found" }, 404)

    const { sex, age, heightCm, weightKg, sessionsPerWeek, sportLevel, goal } = profile

    // Mifflin–St Jeor BMR
    const bmr = sex === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161

    const activityMultiplier = ACTIVITY[sportLevel] ?? 1.375
    const tdee = Math.round(bmr * activityMultiplier)
    const caloricGoal = Math.round(tdee + (GOAL_DELTA[goal] ?? 0))

    // Macros: protein 2 g/kg body weight; fat 30% of TDEE calories / 9; carbs = remainder.
    const proteinG = Math.round(2 * weightKg)
    const fatG = Math.round((tdee * 0.30) / 9)
    const carbsG = Math.round((caloricGoal - proteinG * 4 - fatG * 9) / 4)

    return c.json({ bmr: Math.round(bmr), tdee, caloricGoal, proteinG, carbsG: Math.max(0, carbsG), fatG })
  })
