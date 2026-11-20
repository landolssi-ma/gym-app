import { Hono } from "hono"

import { eq, healthProbe } from "@workspace/db"

import type { AppEnv } from "../index"

// Token-gated so anonymous traffic cannot hit the database.
export const health = new Hono<AppEnv>()
  .use(async (c, next) => {
    if (c.req.header("x-smoke-token") !== c.var.deps.config.smokeToken) return c.json({ error: "not_found" }, 404)
    await next()
  })
  // Read-after-write: the last select must see the value just written. An unreachable database
  // throws into the app's error handler, which answers 500.
  .get("/", async (c) => {
    const { db } = c.var.deps
    const nonce = crypto.randomUUID()
    const read = () => db.select({ value: healthProbe.value }).from(healthProbe).where(eq(healthProbe.id, "probe"))
    await read()
    await db.insert(healthProbe).values({ id: "probe", value: nonce }).onConflictDoUpdate({ target: healthProbe.id, set: { value: nonce } })
    const [row] = await read()
    return c.json({ db: true, fresh: row?.value === nonce })
  })
  // Proves the PostHog capture path end to end; false when analytics is not configured.
  .get("/analytics", async (c) => {
    const status = (await c.var.deps.analytics?.capture("smoke_probe", "smoke", {})) ?? 0
    return c.json({ analytics: status >= 200 && status < 300 })
  })
