import { Hono } from "hono"
import { z } from "zod"

import { and, desc, eq, projects } from "@workspace/db"

import { requireUser, type GuardEnv } from "../guards"
import { json } from "../validate"

// The reference module: account-owned CRUD and CSV export.
const name = z.string().trim().min(1).max(120)
const description = z.string().trim().max(2000)
const Create = z.object({ name, description: description.default("") })
// No defaults: a field left out of an update stays as it is.
const Update = z.object({ name, description }).partial()
const columns = { id: projects.id, name: projects.name, description: projects.description, createdAt: projects.createdAt, updatedAt: projects.updatedAt }
// Every read and write is scoped to the signed-in account.
const own = (userId: string, id: string) => and(eq(projects.userId, userId), eq(projects.id, id))
const notFound = { error: "not_found" } as const
const isUuid = (id: string) => z.uuid().safeParse(id).success

// RFC 4180: quote every field, double any quote inside it.
const csvRow = (cells: string[]) => cells.map((c) => `"${c.replaceAll('"', '""')}"`).join(",")

export const projectsRoutes = new Hono<GuardEnv>()
  .use(requireUser)
  .get("/", async (c) => c.json({ projects: await c.var.deps.db.select(columns).from(projects).where(eq(projects.userId, c.var.userId)).orderBy(desc(projects.createdAt)) }))
  .post("/", json(Create), async (c) => {
    const [row] = await c.var.deps.db.insert(projects).values({ userId: c.var.userId, createdBy: c.var.userId, ...c.req.valid("json") }).returning(columns)
    return c.json(row, 201)
  })
  .get("/export", async (c) => {
    const rows = await c.var.deps.db.select(columns).from(projects).where(eq(projects.userId, c.var.userId)).orderBy(desc(projects.createdAt))
    const csv = [csvRow(["name", "description", "created_at"]), ...rows.map((p) => csvRow([p.name, p.description, p.createdAt.toISOString()]))].join("\r\n")
    return c.body(csv, 200, { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="projects.csv"' })
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id")
    const [row] = isUuid(id) ? await c.var.deps.db.select(columns).from(projects).where(own(c.var.userId, id)) : []
    return row ? c.json(row) : c.json(notFound, 404)
  })
  .patch("/:id", json(Update), async (c) => {
    const id = c.req.param("id")
    const [row] = isUuid(id) ? await c.var.deps.db.update(projects).set({ ...c.req.valid("json"), updatedAt: new Date() }).where(own(c.var.userId, id)).returning(columns) : []
    return row ? c.json(row) : c.json(notFound, 404)
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id")
    const rows = isUuid(id) ? await c.var.deps.db.delete(projects).where(own(c.var.userId, id)).returning({ id: projects.id }) : []
    return rows.length ? c.json({ ok: true }) : c.json(notFound, 404)
  })
