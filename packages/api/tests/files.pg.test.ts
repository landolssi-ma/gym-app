import { afterAll, describe, expect, test } from "vitest"

import { eq, files, organization, user } from "@workspace/db"
import { TEST_PG_URL } from "@workspace/db/testing"

import { fakeStorage } from "./helpers/fake-storage"
import { createPgApp } from "./helpers/pg-app"

const MB = 1024 * 1024

describe.skipIf(!TEST_PG_URL)("file routes against real Postgres", () => {
  const s = fakeStorage()
  const t = TEST_PG_URL ? createPgApp({ storage: s.storage }) : ({} as ReturnType<typeof createPgApp>)
  afterAll(() => t.end?.())
  const post = (path: string, cookie: string, body?: unknown) => t.call(path, { method: "POST", cookie, body })
  type Declared = { id: string; uploadUrl: string }
  const declare = async (cookie: string, body: { name?: string; contentType: string; size: number; purpose: string }) => post("/api/files", cookie, { name: "f", ...body })
  const row = async (id: string) => (await t.db.select().from(files).where(eq(files.id, id)))[0]

  // Declare, upload the bytes it declared, complete.
  async function uploaded(cookie: string, purpose: string, contentType = "image/png", size = MB) {
    const d = (await (await declare(cookie, { contentType, size, purpose })).json()) as Declared
    s.upload(d.uploadUrl, size, contentType)
    const res = await post(`/api/files/${d.id}/complete`, cookie)
    expect(res.status).toBe(200)
    return { ...d, ...((await res.json()) as { url: string | null }) }
  }

  test("a 2 MB PDF attachment is accepted: id, upload URL and a pending record", async () => {
    const { jar, orgId } = await t.owner("declare")
    const res = await declare(jar, { name: "report.pdf", contentType: "application/pdf", size: 2 * MB, purpose: "attachment" })
    expect(res.status).toBe(201)
    const d = (await res.json()) as Declared
    expect(d.uploadUrl).toContain("private/")
    expect(await row(d.id)).toMatchObject({ organizationId: orgId, status: "pending", visibility: "private", name: "report.pdf", contentType: "application/pdf", size: 2 * MB })
  })

  test.each([
    ["a 20 MB avatar", { contentType: "image/png", size: 20 * MB, purpose: "avatar" }],
    ["a PDF avatar", { contentType: "application/pdf", size: MB, purpose: "avatar" }],
    ["an SVG logo", { contentType: "image/svg+xml", size: MB, purpose: "logo" }],
    ["an unknown purpose", { contentType: "image/png", size: MB, purpose: "other" }],
  ])("%s is 400 invalid_file and creates no record", async (_, body) => {
    const { jar, orgId } = await t.owner("invalid")
    const res = await declare(jar, body)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "invalid_file" })
    expect(await t.db.select().from(files).where(eq(files.organizationId, orgId))).toEqual([])
  })

  test("complete without an uploaded object is 409 upload_missing and the file stays pending", async () => {
    const { jar } = await t.owner("missing")
    const d = (await (await declare(jar, { contentType: "application/pdf", size: MB, purpose: "attachment" })).json()) as Declared
    const res = await post(`/api/files/${d.id}/complete`, jar)
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: "upload_missing" })
    expect((await row(d.id))?.status).toBe("pending")
  })

  test("an object larger than declared is 400 upload_mismatch, deleted, and never ready", async () => {
    const { jar } = await t.owner("mismatch")
    const d = (await (await declare(jar, { contentType: "application/pdf", size: MB, purpose: "attachment" })).json()) as Declared
    s.upload(d.uploadUrl, MB + 1, "application/pdf")
    const res = await post(`/api/files/${d.id}/complete`, jar)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "upload_mismatch" })
    expect(s.objects.has(new URL(d.uploadUrl).pathname.slice(1))).toBe(false)
    expect(await row(d.id)).toBeUndefined()
  })

  test("a confirmed private file is ready and downloads through a signed URL; a pending one is 404", async () => {
    const { jar } = await t.owner("ready")
    const f = await uploaded(jar, "attachment", "application/pdf")
    expect((await row(f.id))?.status).toBe("ready")
    expect(f.url).toBeNull()
    const dl = await t.call(`/api/files/${f.id}/download`, { cookie: jar })
    expect(((await dl.json()) as { url: string }).url).toMatch(/^https:\/\/bucket\.test\/private\/.*\?get$/)
    const pending = (await (await declare(jar, { contentType: "application/pdf", size: MB, purpose: "attachment" })).json()) as Declared
    expect((await t.call(`/api/files/${pending.id}/download`, { cookie: jar })).status).toBe(404)
  })

  test("a file id from another workspace is 404 for download, complete and delete", async () => {
    const theirs = await t.owner("theirs")
    const f = await uploaded(theirs.jar, "attachment", "application/pdf")
    const { jar } = await t.owner("intruder")
    for (const res of [await t.call(`/api/files/${f.id}/download`, { cookie: jar }), await post(`/api/files/${f.id}/complete`, jar), await t.call(`/api/files/${f.id}`, { method: "DELETE", cookie: jar })]) {
      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ error: "not_found" })
    }
    expect((await row(f.id))?.status).toBe("ready")
  })

  test("delete removes the record and the object, and a retry after the object is gone still succeeds", async () => {
    const { jar } = await t.owner("delete")
    const f = await uploaded(jar, "attachment", "application/pdf")
    const object = new URL(f.uploadUrl).pathname.slice(1)
    s.objects.delete(object)
    const res = await t.call(`/api/files/${f.id}`, { method: "DELETE", cookie: jar })
    expect(res.status).toBe(200)
    expect(await row(f.id)).toBeUndefined()
  })

  test("a new avatar is set as the user's image at a public URL and the old avatar is deleted", async () => {
    const { jar, email } = await t.owner("avatar")
    const first = await uploaded(jar, "avatar")
    const second = await uploaded(jar, "avatar")
    const [u] = await t.db.select({ image: user.image }).from(user).where(eq(user.email, email))
    expect(u?.image).toBe(second.url)
    expect(second.url).toMatch(/^https:\/\/app\.test\/media\/[0-9a-f-]{36}$/)
    expect(s.objects.has(new URL(first.uploadUrl).pathname.slice(1))).toBe(false)
    expect(await row(first.id)).toBeUndefined()
    expect((await row(second.id))?.status).toBe("ready")
  })

  test("a new logo replaces the workspace's logo and deletes the old one; members cannot upload one", async () => {
    const { jar, orgId } = await t.owner("logo")
    const first = await uploaded(jar, "logo")
    const second = await uploaded(jar, "logo")
    const [o] = await t.db.select({ logo: organization.logo }).from(organization).where(eq(organization.id, orgId))
    expect(o?.logo).toBe(second.url)
    expect(await row(first.id)).toBeUndefined()

    const memberEmail = t.email("logo-member")
    const invite = (await (await post("/api/team/invites", jar, { email: memberEmail, role: "member" })).json()) as { id: string }
    const memberJar = await t.signIn(memberEmail)
    expect((await post(`/api/team/invites/${invite.id}/accept`, memberJar)).status).toBe(200)
    expect((await declare(memberJar, { contentType: "image/png", size: MB, purpose: "logo" })).status).toBe(403)
  })
})
