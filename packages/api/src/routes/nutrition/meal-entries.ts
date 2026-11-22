import { Hono } from "hono"
import { z } from "zod"

import { and, eq, foods, mealEntries, or, isNull } from "@workspace/db"

import { requireUser, type GuardEnv } from "../../guards"
import { json, valid } from "../../validate"

const EntryInput = z.object({
  foodId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(["breakfast", "lunch", "dinner", "snack_1", "snack_2"]),
  weightG: z.number().positive(),
})

export const mealEntriesRoute = new Hono<GuardEnv>()
  .use(requireUser)
  .get("/", async (c) => {
    const date = c.req.query("date")
    if (!date) return c.json({ error: "invalid" }, 400)

    const rows = await c.var.deps.db
      .select({
        id: mealEntries.id,
        slot: mealEntries.slot,
        weightG: mealEntries.weightG,
        createdAt: mealEntries.createdAt,
        food: {
          id: foods.id,
          name: foods.name,
          preparationState: foods.preparationState,
          caloriesPer100g: foods.caloriesPer100g,
          proteinPer100g: foods.proteinPer100g,
          carbsPer100g: foods.carbsPer100g,
          fatPer100g: foods.fatPer100g,
        },
      })
      .from(mealEntries)
      .innerJoin(foods, eq(mealEntries.foodId, foods.id))
      .where(and(eq(mealEntries.userId, c.var.userId), eq(mealEntries.date, date)))
      .orderBy(mealEntries.createdAt)

    return c.json({ entries: rows })
  })
  .post("/", json(EntryInput), async (c) => {
    const { foodId, date, slot, weightG } = c.req.valid("json")
    const db = c.var.deps.db

    // Verify food belongs to this user or is a system food.
    const [food] = await db.select().from(foods).where(and(eq(foods.id, foodId), or(isNull(foods.userId), eq(foods.userId, c.var.userId)))).limit(1)
    if (!food) return c.json({ error: "not_found" }, 404)

    const [entry] = await db.insert(mealEntries).values({ userId: c.var.userId, foodId, date, slot, weightG }).returning()
    return c.json({ entry }, 201)
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id")
    const db = c.var.deps.db

    const [entry] = await db.select().from(mealEntries).where(and(eq(mealEntries.id, id), eq(mealEntries.userId, c.var.userId))).limit(1)
    if (!entry) return c.json({ error: "not_found" }, 404)

    await db.delete(mealEntries).where(eq(mealEntries.id, id))
    return c.json({ ok: true })
  })
