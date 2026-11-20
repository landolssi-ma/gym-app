import { and, eq, files, inArray, isNotNull, lt, organization, sql, user } from "@workspace/db"

import type { Deps } from "../index"

// Deleted workspaces are kept 30 days, then removed for good: first their stored objects, then the
// workspace, whose rows (file records included) cascade. One step per workspace, so a retry
// resumes where a failure stopped.
export function purgeOrganizationsFunction(deps: Deps) {
  return deps.jobs.define({ id: "purge-organizations", triggers: [{ cron: "0 9 * * *" }], retries: 2 }, async ({ step }) => {
    const expired = await step.run("find-expired", () =>
      deps.db
        .select({ id: organization.id })
        .from(organization)
        .where(and(isNotNull(organization.deletedAt), lt(organization.deletedAt, sql`now() - interval '30 days'`))),
    )
    for (const { id } of expired) await step.run(`purge-${id}`, () => purgeOrganization(deps, id))
    return { purged: expired.length }
  })
}

async function purgeOrganization(deps: Deps, orgId: string) {
  const stored = await deps.db.select({ key: files.key, visibility: files.visibility, purpose: files.purpose }).from(files).where(eq(files.organizationId, orgId))
  // S3 answers a missing object with success, so a retried purge never fails on objects already gone.
  for (const f of stored) await deps.storage.delete(f.visibility, f.key)
  // An avatar uploaded while in this workspace goes with it; its owner falls back to initials.
  const avatars = stored.filter((f) => f.purpose === "avatar").map((f) => deps.storage.publicUrl(f.key))
  if (avatars.length) await deps.db.update(user).set({ image: null }).where(inArray(user.image, avatars))
  await deps.db.delete(organization).where(eq(organization.id, orgId))
}
