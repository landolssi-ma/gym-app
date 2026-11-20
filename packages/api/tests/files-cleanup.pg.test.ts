import { afterAll, describe, expect, test } from "vitest"

import { eq, files, organization, sql, user } from "@workspace/db"
import { TEST_PG_URL } from "@workspace/db/testing"
import { createJobs } from "@workspace/jobs"

import { cleanupFilesFunction } from "../src/jobs/cleanup-files"
import { purgeOrganizationsFunction } from "../src/jobs/purge-organizations"
import { fakeStorage } from "./helpers/fake-storage"
import { createPgApp } from "./helpers/pg-app"

describe.skipIf(!TEST_PG_URL)("file cleanup and workspace purge against real Postgres", () => {
  const s = fakeStorage()
  const t = TEST_PG_URL ? createPgApp({ storage: s.storage }) : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  const jobs = createJobs({ appId: "t", eventKey: "k", signingKey: "s", isDev: true })
  const step = { step: { run: async (_n: string, cb: () => unknown) => cb() } } as never
  const post = (path: string, cookie: string, body?: unknown) => t.call(path, { method: "POST", cookie, body })
  const objectOf = (uploadUrl: string) => new URL(uploadUrl).pathname.slice(1)

  async function declareAndUpload(cookie: string, purpose: string, complete: boolean) {
    const contentType = purpose === "attachment" ? "application/pdf" : "image/png"
    const d = (await (await post("/api/files", cookie, { name: "f", contentType, size: 10, purpose })).json()) as { id: string; uploadUrl: string }
    s.upload(d.uploadUrl, 10, contentType)
    if (complete) expect((await post(`/api/files/${d.id}/complete`, cookie)).status).toBe(200)
    return { id: d.id, object: objectOf(d.uploadUrl) }
  }
  const age = (id: string, hours: number) => t.db.update(files).set({ createdAt: sql`now() - make_interval(hours => ${hours})` }).where(eq(files.id, id))
  const exists = async (id: string) => (await t.db.select().from(files).where(eq(files.id, id))).length === 1

  test("a pending file 25 hours old is removed with its object; younger pending and ready files stay", async () => {
    const { jar } = await t.owner("cleanup")
    const abandoned = await declareAndUpload(jar, "attachment", false)
    const recent = await declareAndUpload(jar, "attachment", false)
    const ready = await declareAndUpload(jar, "attachment", true)
    await age(abandoned.id, 25)
    await age(recent.id, 23)
    await age(ready.id, 48)
    await cleanupFilesFunction({ ...t.deps, jobs })["fn"](step)
    expect(await exists(abandoned.id)).toBe(false)
    expect(s.objects.has(abandoned.object)).toBe(false)
    for (const f of [recent, ready]) {
      expect(await exists(f.id)).toBe(true)
      expect(s.objects.has(f.object)).toBe(true)
    }
  })

  test("purging a workspace with 20 files removes every object and record, its logo and its avatars", async () => {
    const { jar, orgId, email } = await t.owner("purge")
    const uploaded = [await declareAndUpload(jar, "logo", true), await declareAndUpload(jar, "avatar", true)]
    for (let i = 0; i < 17; i++) uploaded.push(await declareAndUpload(jar, "attachment", true))
    uploaded.push(await declareAndUpload(jar, "attachment", false))
    expect(uploaded).toHaveLength(20)
    expect(uploaded.every((f) => s.objects.has(f.object))).toBe(true)

    const kept = await t.owner("kept")
    const other = await declareAndUpload(kept.jar, "attachment", true)

    expect((await post("/api/organizations/current/delete", jar, { confirm: (await t.db.select({ name: organization.name }).from(organization).where(eq(organization.id, orgId)))[0]!.name })).status).toBe(200)
    await t.db.update(organization).set({ deletedAt: sql`now() - interval '31 days'` }).where(eq(organization.id, orgId))
    await purgeOrganizationsFunction({ ...t.deps, jobs })["fn"](step)

    expect(uploaded.filter((f) => s.objects.has(f.object))).toEqual([])
    expect(await t.db.select().from(files).where(eq(files.organizationId, orgId))).toEqual([])
    expect((await t.db.select({ image: user.image }).from(user).where(eq(user.email, email)))[0]?.image).toBeNull()
    expect(s.objects.has(other.object)).toBe(true)
    expect(await exists(other.id)).toBe(true)
  })
})
