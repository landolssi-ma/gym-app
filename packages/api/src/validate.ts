import type { ValidationTargets } from "hono"
import { validator } from "hono/validator"
import type { z } from "zod"

// Typed request validation: `hc` sees the parsed input type, and any invalid body, query or path
// parameter is refused with 400 (code `invalid` unless the route names its own) before the handler runs.
export const valid = <T extends keyof ValidationTargets, S extends z.ZodType, E extends string = "invalid">(target: T, schema: S, error = "invalid" as E) =>
  validator(target, (value, c) => {
    const r = schema.safeParse(value)
    return r.success ? (r.data as z.output<S>) : c.json({ error }, 400)
  })

export const json = <S extends z.ZodType, E extends string = "invalid">(schema: S, error?: E) => valid("json", schema, error)
