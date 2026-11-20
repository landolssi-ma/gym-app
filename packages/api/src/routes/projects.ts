import { Hono } from "hono"
import { z } from "zod"

import { and, desc, eq, projects, type Db } from "@workspace/db"

import { checkCountLimit, requireFeature, requireLiveSubscription } from "../entitlements"
import { requireActiveOrg, requireUser, type GuardEnv } from "../guards"
import { loadSubscription } from "../subscriptions"
import { json } from "../validate"

// The reference module: guards, validation, tenant isolation, a count limit and a feature gate.
const name = z.string().trim().min(1).max(120)
const description = z.string().trim().max(2000)
const Create = z.object({ name, description: description.default("") })
// No defaults: a field left out of an update stays as it is.
const Update = z.object({ name, description }).partial()
const columns = { id: projects.id, name: projects.name, description: projects.description, createdAt: projects.createdAt, updatedAt: projects.updatedAt }
// Every read and write is scoped to the active workspace: another workspace's id matches nothing (404).
const own = (orgId: string, id: string) => and(eq(projects.organizationId, orgId), eq(projects.id, id))
const notFound = { error: "not_found" } as const
const isUuid = (id: string) => z.uuid().safeParse(id).success

// RFC 4180: quote every field, double any quote inside it.
const csvRow = (cells: string[]) => cells.map((c) => `"${c.replaceAll('"', '""')}"`).join(",")

export const projectsRoutes = new Hono<GuardEnv>()
  .use(requireUser, requireActiveOrg, requireLiveSubscription)
  .get("/", async (c) => c.json({ projects: await c.var.deps.db.select(columns).from(projects).where(eq(projects.organizationId, c.var.orgId)).orderBy(desc(projects.createdAt)) }))
  // Counted and inserted in one transaction, so two creates can never both take the last slot.
  .post("/", json(Create), async (c) => {
    const { deps, orgId, userId } = c.var
    const result = await deps.db.transaction(async (tx) => {
      const refusal = await checkCountLimit(tx, await loadSubscription(tx as unknown as Db, orgId), orgId, "projects")
      if (refusal) return { refusal }
      const [row] = await tx.insert(projects).values({ organizationId: orgId, createdBy: userId, ...c.req.valid("json") }).returning(columns)
      return { row: row! }
    })
    if ("refusal" in result) return c.json(result.refusal, 402)
    return c.json(result.row, 201)
  })
  // The feature-gated action: only plans with `export` get a CSV of the workspace's projects.
  .get("/export", requireFeature("export"), async (c) => {
    const rows = await c.var.deps.db.select(columns).from(projects).where(eq(projects.organizationId, c.var.orgId)).orderBy(desc(projects.createdAt))
    const csv = [csvRow(["name", "description", "created_at"]), ...rows.map((p) => csvRow([p.name, p.description, p.createdAt.toISOString()]))].join("\r\n")
    return c.body(csv, 200, { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="projects.csv"' })
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id")
    const [row] = isUuid(id) ? await c.var.deps.db.select(columns).from(projects).where(own(c.var.orgId, id)) : []
    return row ? c.json(row) : c.json(notFound, 404)
  })
  .patch("/:id", json(Update), async (c) => {
    const id = c.req.param("id")
    const [row] = isUuid(id) ? await c.var.deps.db.update(projects).set({ ...c.req.valid("json"), updatedAt: new Date() }).where(own(c.var.orgId, id)).returning(columns) : []
    return row ? c.json(row) : c.json(notFound, 404)
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id")
    const rows = isUuid(id) ? await c.var.deps.db.delete(projects).where(own(c.var.orgId, id)).returning({ id: projects.id }) : []
    return rows.length ? c.json({ ok: true }) : c.json(notFound, 404)
  })
