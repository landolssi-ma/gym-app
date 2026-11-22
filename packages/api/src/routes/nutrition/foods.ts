import { Hono } from "hono"
import { z } from "zod"

import { and, eq, foods, ilike, isNull, or } from "@workspace/db"

import { requireUser, type GuardEnv } from "../../guards"
import { json, valid } from "../../validate"

const FoodInput = z.object({
  name: z.string().min(1).max(200),
  preparationState: z.enum(["raw", "cooked", "drained"]),
  caloriesPer100g: z.number().min(0).max(10000),
  proteinPer100g: z.number().min(0).max(1000),
  carbsPer100g: z.number().min(0).max(1000),
  fatPer100g: z.number().min(0).max(1000),
})

export const foodsRoute = new Hono<GuardEnv>()
  .use(requireUser)
  .get("/", async (c) => {
    const q = c.req.query("q")
    const userId = c.var.userId
    const db = c.var.deps.db

    const rows = await db
      .select()
      .from(foods)
      .where(
        and(
          q ? ilike(foods.name, `%${q}%`) : undefined,
          or(isNull(foods.userId), eq(foods.userId, userId)),
        ),
      )
      .orderBy(foods.name)
    return c.json({ foods: rows })
  })
  .post("/", json(FoodInput), async (c) => {
    const values = c.req.valid("json")
    const [food] = await c.var.deps.db.insert(foods).values({ userId: c.var.userId, ...values }).returning()
    return c.json({ food }, 201)
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id")
    const db = c.var.deps.db

    const [food] = await db.select().from(foods).where(eq(foods.id, id)).limit(1)
    if (!food) return c.json({ error: "not_found" }, 404)
    // System foods (user_id IS NULL) cannot be deleted by anyone.
    if (!food.userId) return c.json({ error: "forbidden" }, 403)
    // Custom food must belong to the requesting user.
    if (food.userId !== c.var.userId) return c.json({ error: "not_found" }, 404)

    await db.delete(foods).where(eq(foods.id, id))
    return c.json({ ok: true })
  })
