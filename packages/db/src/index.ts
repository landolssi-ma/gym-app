import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import * as schema from "./schema"

export * from "./schema"
// Query operators re-exported so consumers need no direct drizzle-orm dependency.
export { and, desc, eq, gt, gte, ilike, inArray, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm"

export type Db = NodePgDatabase<typeof schema>

// One per request: Workers forbid sharing I/O objects across requests. The pool connects lazily.
// max: 5, not 1: Workers allow 6 simultaneous open connections per request, so routes that run
// queries with Promise.all get them in parallel instead of queueing on a single connection.
export function createDb(connectionString: string): { db: Db; end: () => Promise<void> } {
  const pool = new Pool({ connectionString, max: 5 })
  return { db: drizzle({ client: pool, schema }), end: () => pool.end() }
}
