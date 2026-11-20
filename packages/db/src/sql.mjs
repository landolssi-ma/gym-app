// One-off dev query against DATABASE_URL: pnpm --filter @workspace/db db:sql "select 1"
/* global process, console */
import pg from "pg"

const url = process.env.DATABASE_URL // eslint-disable-line turbo/no-undeclared-env-vars
const db = new pg.Client({ connectionString: url })
await db.connect()
try {
  const r = await db.query(process.argv[2])
  console.table(r.rows.length ? r.rows : [{ rowCount: r.rowCount }])
} finally {
  await db.end()
}
