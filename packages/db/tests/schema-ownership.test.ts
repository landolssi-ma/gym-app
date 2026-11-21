import { getTableName, is } from "drizzle-orm"
import { getTableConfig, PgTable } from "drizzle-orm/pg-core"
import { describe, expect, test } from "vitest"

import * as schema from "../src/schema"

// Every product table belongs to an account unless it is listed as platform-wide.
const GLOBAL_TABLES = new Set<string>(["health_probe", "rate_limits", "user", "session", "account", "verification", "rate_limit", "audit_logs", "gym_profiles"])

const tables = (Object.values(schema) as unknown[]).filter((v): v is PgTable => is(v, PgTable))
const owned = tables.filter((t) => !GLOBAL_TABLES.has(getTableName(t)))

describe("schema ownership rule", () => {
  test("every global table listed actually exists", () => {
    const names = new Set(tables.map(getTableName))
    expect([...GLOBAL_TABLES].filter((n) => !names.has(n))).toEqual([])
  })

  test.each(owned.map((t) => [getTableName(t), t] as const))("%s has user_id: NOT NULL, cascade delete, indexed", (name, table) => {
    const config = getTableConfig(table)
    const userId = config.columns.find((c) => c.name === "user_id")
    expect(userId, `${name} has no user_id; add it or list the table in GLOBAL_TABLES`).toBeDefined()
    expect(userId?.notNull, `${name}.user_id must be NOT NULL`).toBe(true)
    const fk = config.foreignKeys.find((f) => f.reference().columns.some((c) => c.name === "user_id"))
    expect(fk?.onDelete, `${name}.user_id must reference user with onDelete cascade`).toBe("cascade")
    const leading = [
      ...config.indexes.map((i) => i.config.columns[0]),
      ...config.primaryKeys.map((pk) => pk.columns[0]),
      ...(userId?.primary ? [userId] : []),
    ].map((c) => (c && "name" in c ? c.name : undefined))
    expect(leading, `${name} needs an index whose first column is user_id`).toContain("user_id")
  })
})
