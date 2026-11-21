import { Hono } from "hono"
import { z } from "zod"

import { eq, gymProfiles } from "@workspace/db"

import { forbidWhileImpersonating, requireUser, type GuardEnv } from "../guards"
import { json } from "../validate"

const GymProfileInput = z.object({
  sex: z.enum(["female", "male", "other"]),
  age: z.number().int().min(13).max(120),
  heightCm: z.number().min(80).max(250),
  weightKg: z.number().min(20).max(500),
  waistCm: z.number().min(40).max(300),
  hipCm: z.number().min(40).max(300).optional(),
  sportLevel: z.enum(["beginner", "intermediate", "advanced"]),
  goal: z.enum(["muscle_gain", "fat_loss", "weight_loss", "maintenance", "body_recomposition"]),
  sessionsPerWeek: z.number().int().min(1).max(7),
})

export const gymProfile = new Hono<GuardEnv>()
  .use(requireUser)
  .get("/", async (c) => {
    const [profile] = await c.var.deps.db.select().from(gymProfiles).where(eq(gymProfiles.userId, c.var.userId)).limit(1)
    return c.json(profile ? { profile, complete: true } : { profile: null, complete: false })
  })
  .put("/", forbidWhileImpersonating, json(GymProfileInput), async (c) => {
    const values = c.req.valid("json")
    const [profile] = await c.var.deps.db.insert(gymProfiles).values({ userId: c.var.userId, ...values, updatedAt: new Date() })
      .onConflictDoUpdate({ target: gymProfiles.userId, set: { ...values, updatedAt: new Date() } })
      .returning()
    return c.json({ profile, complete: true })
  })
