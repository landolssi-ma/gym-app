import { getTableName, is } from "drizzle-orm"
import { getTableConfig, PgTable } from "drizzle-orm/pg-core"
import { describe, expect, test } from "vitest"

import * as schema from "../src/schema"

// Every table belongs to a workspace unless it is listed here, so a new product table cannot
// silently skip tenant isolation. Add a table here only when it is truly not workspace data.
// organization is the workspace itself; the rest are platform-wide (Better Auth's identity tables).
// audit_logs also holds platform-wide entries (a ban has no workspace), so its organization_id is
// nullable; it still cascades, so a purged workspace takes its entries with it.
const GLOBAL_TABLES = new Set<string>(["health_probe", "rate_limits", "organization", "user", "session", "account", "verification", "rate_limit", "webhook_events", "audit_logs"])

const tables = (Object.values(schema) as unknown[]).filter((v): v is PgTable => is(v, PgTable))
const owned = tables.filter((t) => !GLOBAL_TABLES.has(getTableName(t)))

describe("schema ownership rule", () => {
  test("every global table listed actually exists", () => {
    const names = new Set(tables.map(getTableName))
    expect([...GLOBAL_TABLES].filter((n) => !names.has(n))).toEqual([])
  })

  test.each(owned.map((t) => [getTableName(t), t] as const))("%s has organization_id: NOT NULL, cascade delete, indexed", (name, table) => {
    const config = getTableConfig(table)
    const orgId = config.columns.find((c) => c.name === "organization_id")
    expect(orgId, `${name} has no organization_id; add it or list the table in GLOBAL_TABLES`).toBeDefined()
    expect(orgId?.notNull, `${name}.organization_id must be NOT NULL`).toBe(true)
    const fk = config.foreignKeys.find((f) => f.reference().columns.some((c) => c.name === "organization_id"))
    expect(fk?.onDelete, `${name}.organization_id must reference organization with onDelete cascade`).toBe("cascade")
    // A primary key or index that starts with organization_id serves workspace-scoped lookups.
    const leading = [
      ...config.indexes.map((i) => i.config.columns[0]),
      ...config.primaryKeys.map((pk) => pk.columns[0]),
      ...(orgId?.primary ? [orgId] : []),
    ].map((c) => (c && "name" in c ? c.name : undefined))
    expect(leading, `${name} needs an index whose first column is organization_id`).toContain("organization_id")
  })
})
