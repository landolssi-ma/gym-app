import type { InngestFunction } from "inngest"

import type { Deps } from "./index"
import { cleanupFilesFunction } from "./jobs/cleanup-files"

// Every background job the app serves at /api/inngest. A new job is defined in its own module
// (deps.jobs.define) and added to this list; see docs/recipes/add-a-job.md.
export function jobFunctions(deps: Deps): InngestFunction.Any[] {
  return [cleanupFilesFunction(deps)]
}
