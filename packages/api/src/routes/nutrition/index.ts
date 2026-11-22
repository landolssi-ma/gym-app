import { Hono } from "hono"

import type { GuardEnv } from "../../guards"
import { foodsRoute } from "./foods"
import { mealEntriesRoute } from "./meal-entries"
import { needs } from "./needs"

export const nutrition = new Hono<GuardEnv>()
  .route("/needs", needs)
  .route("/foods", foodsRoute)
  .route("/meal-entries", mealEntriesRoute)
