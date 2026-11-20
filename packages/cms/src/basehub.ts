/// <reference path="../.basehub/basehub-types.d.ts" />
import { generateQueryOp } from "basehub"
import type { QueryGenqlSelection, QueryResult } from "basehub"
import type { CreateOp, Operation } from "basehub/api-transaction"

export type { CreateOp, Operation }

// The only file that imports `basehub`. Reads map BaseHub rows into this package's own shapes;
// callers (cms.ts) Zod-validate them, so nulls are passed through rather than defaulted.

export type CmsCache = { tags: string[]; revalidate: number }
export type BasehubSourceConfig = { apiKey: string; apiUrl: string }

const API_VERSION = "4"
const LIST = { first: 100 }

// One plain fetch instead of the SDK client: the SDK only forwards `next` tags when it can import
// next/headers itself, resolves refs with an extra request, and auto-enables draft mode. This
// sends no draft header, so only committed (published) content is ever returned.
async function query<S extends QueryGenqlSelection>(config: BasehubSourceConfig, selection: S, cache: CmsCache) {
  const init: RequestInit & { next: CmsCache } = {
    method: "POST",
    headers: { "content-type": "application/json", "x-basehub-token": config.apiKey, "x-basehub-api-version": API_VERSION },
    body: JSON.stringify(generateQueryOp(selection)),
    next: cache,
  }
  const res = await fetch(config.apiUrl, init)
  if (!res.ok) throw new Error(`cms request failed: ${res.status}`)
  const { data, errors } = (await res.json()) as { data?: QueryResult<S>; errors?: { message: string }[] }
  if (!data || errors?.length) throw new Error(`cms query failed: ${errors?.[0]?.message ?? "no data"}`)
  return data
}

// Rich text -> plain paragraphs and bullets, never provider HTML.
function blocks(markdown: string | undefined) {
  const paragraphs: string[] = []
  const bullets: string[] = []
  for (const block of (markdown ?? "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)) {
    const lines = block.split("\n")
    if (lines.every((l) => /^[-*] /.test(l))) bullets.push(...lines.map((l) => unescape(l.slice(2))))
    else paragraphs.push(unescape(lines.join(" ")))
  }
  return { paragraphs, bullets: bullets.length ? bullets : undefined }
}
const unescape = (s: string) => s.replace(/\\([\\`*_{}[\]()#+\-.!>])/g, "$1")

const image = { url: true, alt: true, width: true, height: true } as const
type Img = { url: string; alt: string | null; width: number; height: number } | null
const toImage = (i: Img) => i && { src: i.url, alt: i.alt, width: i.width, height: i.height }
const sections = { __args: LIST, items: { _title: true, anchor: true, body: { markdown: true } } } as const
type Sections = { items: { _title: string; anchor: string; body: { markdown: string } | null }[] } | null

const toSections = (s: Sections) => s?.items.map((i) => ({ id: i.anchor, heading: i._title, ...blocks(i.body?.markdown) }))

export function createBasehubSource(config: BasehubSourceConfig) {
  return {
    async articles(cache: CmsCache) {
      const { articles } = await query(config, {
        articles: {
          __args: LIST,
          items: {
            _title: true, slug: true, description: true, category: true, image, imageCreditLabel: true, imageCreditHref: true,
            intro: true, sections, sources: { __args: LIST, items: { _title: true, href: true } },
          },
        },
      }, cache)
      return articles.items.map((a) => ({
        slug: a.slug, title: a._title, description: a.description, category: a.category,
        image: toImage(a.image),
        imageCredit: a.imageCreditLabel && a.imageCreditHref ? { label: a.imageCreditLabel, href: a.imageCreditHref } : undefined,
        intro: a.intro, sections: toSections(a.sections), sources: a.sources?.items.map((s) => ({ label: s._title, href: s.href })),
      }))
    },
    async legalDocuments(cache: CmsCache) {
      const { legalDocuments } = await query(config, { legalDocuments: { __args: LIST, items: { kind: true, sections } } }, cache)
      return legalDocuments.items.map((d) => ({ kind: d.kind, sections: toSections(d.sections) }))
    },
    async changelogEntries(cache: CmsCache) {
      const { changelogEntries } = await query(config, {
        changelogEntries: { __args: { ...LIST, orderBy: "date__DESC" }, items: { _title: true, date: true, body: { markdown: true } } },
      }, cache)
      return changelogEntries.items.map((e) => ({ date: e.date, title: e._title, body: blocks(e.body?.markdown).paragraphs }))
    },
  }
}
export type BasehubSource = ReturnType<typeof createBasehubSource>

// Admin-token-only client for scripts (schema setup, content migration). Never used on the
// request path -- the runtime reader is createBasehubSource above.
export type CmsAdminConfig = { adminApiKey: string; apiUrl: string }

export function createCmsAdmin(config: CmsAdminConfig) {
  // Raw requests against the draft, not the SDK client: the SDK resolves its own ref and returned
  // stale block ids for the live collections, so row creates against them failed silently.
  async function gql<T>(query: string, variables: Record<string, unknown> = {}) {
    const res = await fetch(config.apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "x-basehub-token": config.adminApiKey, "x-basehub-api-version": API_VERSION, "x-basehub-draft": "true" },
      body: JSON.stringify({ query, variables }),
    })
    const { data, errors } = (await res.json()) as { data?: T; errors?: { message: string }[] }
    if (!data || errors?.length) throw new Error(`basehub admin request failed: ${errors?.[0]?.message ?? res.status}`)
    return data
  }
  return {
    // One operation per transaction so a failure names it, then the commit on its own:
    // `autoCommit`, or a commit op batched after creates, makes BaseHub fail with no message.
    async transaction(operations: Operation[], commitMessage: string) {
      const commit: Operation = { type: "commit", branchName: "main", message: commitMessage }
      for (const [i, op] of [...operations, commit].entries()) {
        const { transaction } = await gql<{ transaction: { status: string; message: string | null } }>(
          "mutation($data: String!) { transaction(data: $data, timeout: 120000) { status message } }",
          { data: JSON.stringify([op]) },
        )
        if (transaction.status !== "Completed") throw new Error(`basehub transaction ${i} ${transaction.status}: ${transaction.message ?? ""} ${JSON.stringify(op).slice(0, 400)}`)
      }
    },
    // Collection apiName -> its list block id (parent for new rows) and item component id
    // (what `allowedComponents` accepts).
    async collections(): Promise<Record<string, { id: string; componentId: string }>> {
      const { _structure } = await gql<{ _structure: string }>("{ _structure(format: json) }")
      const blocks = (JSON.parse(_structure) as { content: { id: string; apiName: string | null; props: { targetBlockId?: string } }[] }).content
      return Object.fromEntries(
        blocks.flatMap((b) => (b.apiName && b.props.targetBlockId ? [[b.apiName, { id: b.id, componentId: b.props.targetBlockId }]] : [])),
      )
    },
    // Uploads a file to BaseHub's asset storage and returns its hosted URL.
    async upload(fileName: string, body: Uint8Array, contentType: string) {
      const { getUploadSignedURL } = await gql<{ getUploadSignedURL: { signedURL: string; uploadURL: string } }>(
        "mutation($fileName: String!) { getUploadSignedURL(fileName: $fileName) { signedURL uploadURL } }",
        { fileName },
      )
      const res = await fetch(getUploadSignedURL.signedURL, { method: "PUT", body: body as BodyInit, headers: { "content-type": contentType } })
      if (!res.ok) throw new Error(`basehub upload ${fileName} failed: ${res.status}`)
      return getUploadSignedURL.uploadURL
    },
  }
}
export type CmsAdmin = ReturnType<typeof createCmsAdmin>
