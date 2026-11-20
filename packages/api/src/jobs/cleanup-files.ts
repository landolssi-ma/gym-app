import { and, eq, files, lt, sql } from "@workspace/db"

import type { Deps } from "../index"
import { removeFile } from "../routes/files"

// Hourly: uploads declared but never completed within 24 hours are removed with any object the
// browser managed to upload. A batch per run keeps each run short; a backlog clears over the next runs.
export function cleanupFilesFunction(deps: Deps) {
  return deps.jobs.define({ id: "cleanup-pending-files", triggers: [{ cron: "0 * * * *" }], retries: 2 }, async ({ step }) =>
    step.run("delete-abandoned", async () => {
      const stale = await deps.db
        .select({ id: files.id, key: files.key, visibility: files.visibility })
        .from(files)
        .where(and(eq(files.status, "pending"), lt(files.createdAt, sql`now() - interval '24 hours'`)))
        .limit(500)
      for (const f of stale) await removeFile(deps, f)
      return { removed: stale.length }
    }),
  )
}
