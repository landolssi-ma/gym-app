import { Hono } from "hono"
import { z } from "zod"

import { and, eq, files, organization, user } from "@workspace/db"

import { FILE_PURPOSES, type FilePurpose } from "../files"
import { requireActiveOrg, requireUser, type GuardEnv } from "../guards"
import { json } from "../validate"

type Deps = GuardEnv["Variables"]["deps"]
type FileRow = typeof files.$inferSelect

const declaration = z
  .object({ name: z.string().trim().min(1).max(255), contentType: z.string(), size: z.number().int().positive(), purpose: z.enum(Object.keys(FILE_PURPOSES) as [FilePurpose]) })
  .refine((f) => (FILE_PURPOSES[f.purpose].types as readonly string[]).includes(f.contentType) && f.size <= FILE_PURPOSES[f.purpose].maxSize)

const notFound = { error: "not_found" } as const
const isManager = (role: string) => role === "owner" || role === "admin"

// Removes the object first, then the row: a retry after a failure in between still finds the row.
// S3 answers a missing object with success, so a retried delete never fails.
export async function removeFile(deps: Deps, f: Pick<FileRow, "id" | "key" | "visibility">) {
  await deps.storage.delete(f.visibility, f.key)
  await deps.db.delete(files).where(eq(files.id, f.id))
}

// The avatar or logo a public URL points at, if it is one of ours (a Google avatar is not).
async function fileAtUrl(deps: Deps, orgId: string | null, url: string | null) {
  const prefix = deps.storage.publicUrl("")
  if (!url?.startsWith(prefix)) return null
  const [f] = await deps.db.select().from(files).where(eq(files.key, url.slice(prefix.length)))
  return f && (orgId === null || f.organizationId === orgId) ? f : null
}

// Points the user's avatar or the workspace's logo at the new file, then deletes the one it replaced.
async function applyPurpose(deps: Deps, f: FileRow, userId: string, orgId: string) {
  const url = deps.storage.publicUrl(f.key)
  if (f.purpose === "avatar") {
    const [u] = await deps.db.select({ image: user.image }).from(user).where(eq(user.id, userId))
    await deps.db.update(user).set({ image: url }).where(eq(user.id, userId))
    const old = await fileAtUrl(deps, null, u?.image ?? null)
    if (old) await removeFile(deps, old)
  } else if (f.purpose === "logo") {
    const [o] = await deps.db.select({ logo: organization.logo }).from(organization).where(eq(organization.id, orgId))
    await deps.db.update(organization).set({ logo: url }).where(eq(organization.id, orgId))
    const old = await fileAtUrl(deps, orgId, o?.logo ?? null)
    if (old) await removeFile(deps, old)
  }
}

// Uploads go straight from the browser to storage: declare, PUT to the returned URL, then complete.
export const filesRoutes = new Hono<GuardEnv>()
  .use(requireUser, requireActiveOrg)
  .post("/", json(declaration, "invalid_file"), async (c) => {
    const { deps, orgId, orgRole, userId } = c.var
    const d = c.req.valid("json")
    if (d.purpose === "logo" && !isManager(orgRole)) return c.json({ error: "forbidden" }, 403)
    const { visibility } = FILE_PURPOSES[d.purpose]
    const key = deps.storage.newKey()
    const [row] = await deps.db
      .insert(files)
      .values({ organizationId: orgId, key, name: d.name, contentType: d.contentType, size: d.size, purpose: d.purpose, visibility, uploadedBy: userId })
      .returning({ id: files.id })
    return c.json({ id: row!.id, uploadUrl: await deps.storage.uploadUrl(visibility, key, d.contentType) }, 201)
  })
  .post("/:id/complete", async (c) => {
    const { deps, orgId, orgRole, userId } = c.var
    const f = await findFile(deps, orgId, c.req.param("id"))
    if (!f) return c.json(notFound, 404)
    if (f.purpose === "logo" && !isManager(orgRole)) return c.json({ error: "forbidden" }, 403)
    if (f.status === "ready") return c.json({ id: f.id, url: f.visibility === "public" ? deps.storage.publicUrl(f.key) : null })
    const stored = await deps.storage.head(f.visibility, f.key)
    if (!stored) return c.json({ error: "upload_missing" }, 409)
    if (stored.size !== f.size || stored.contentType !== f.contentType) {
      await removeFile(deps, f)
      return c.json({ error: "upload_mismatch" }, 400)
    }
    await deps.db.update(files).set({ status: "ready", updatedAt: new Date() }).where(eq(files.id, f.id))
    await applyPurpose(deps, f, userId, orgId)
    return c.json({ id: f.id, url: f.visibility === "public" ? deps.storage.publicUrl(f.key) : null })
  })
  .get("/:id/download", async (c) => {
    const { deps, orgId } = c.var
    const f = await findFile(deps, orgId, c.req.param("id"))
    if (!f || f.status !== "ready") return c.json(notFound, 404)
    return c.json({ url: f.visibility === "public" ? deps.storage.publicUrl(f.key) : await deps.storage.downloadUrl(f.visibility, f.key) })
  })
  .delete("/:id", async (c) => {
    const { deps, orgId, orgRole, userId } = c.var
    const f = await findFile(deps, orgId, c.req.param("id"))
    if (!f) return c.json(notFound, 404)
    // A logo is the workspace's, an avatar its owner's; attachments belong to every member.
    if ((f.purpose === "logo" && !isManager(orgRole)) || (f.purpose === "avatar" && f.uploadedBy !== userId)) return c.json({ error: "forbidden" }, 403)
    await removeFile(deps, f)
    const url = deps.storage.publicUrl(f.key)
    if (f.purpose === "avatar") await deps.db.update(user).set({ image: null }).where(and(eq(user.id, userId), eq(user.image, url)))
    if (f.purpose === "logo") await deps.db.update(organization).set({ logo: null }).where(and(eq(organization.id, orgId), eq(organization.logo, url)))
    return c.json({ ok: true })
  })

// An id from another workspace is indistinguishable from an unknown id.
async function findFile(deps: Deps, orgId: string, id: string) {
  if (!z.uuid().safeParse(id).success) return null
  const [f] = await deps.db.select().from(files).where(and(eq(files.id, id), eq(files.organizationId, orgId)))
  return f ?? null
}
