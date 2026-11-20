import { AwsClient } from "aws4fetch"

// Any S3-compatible store (R2, AWS S3, Backblaze, MinIO) over plain HTTPS: no runtime bindings.
// One bucket; public (avatars, logos, served by /media) and private (read through signed URLs)
// are top-level folders inside it.
export type Folder = "public" | "private"

export type StorageConfig = {
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  appOrigin: string
}

export const UPLOAD_SECONDS = 15 * 60
export const DOWNLOAD_SECONDS = 5 * 60

export function createStorage(c: StorageConfig) {
  const s3 = new AwsClient({ accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey, service: "s3", region: "auto" })
  const url = (folder: Folder, key: string) => `${c.endpoint}/${c.bucket}/${folder}/${key.split("/").map(encodeURIComponent).join("/")}`
  const call = async (method: string, folder: Folder, key: string, init: RequestInit = {}) => {
    const r = await s3.fetch(url(folder, key), { method, ...init })
    if (!r.ok && !((method === "GET" || method === "HEAD") && r.status === 404)) {
      const code = (await r.text()).match(/<Code>(.*?)<\/Code>/)?.[1] ?? ""
      throw new Error(`storage ${method} failed: ${r.status} ${code}`.trim())
    }
    return r
  }
  const presign = async (method: string, folder: Folder, key: string, seconds: number, headers: Record<string, string> = {}) => {
    const u = new URL(url(folder, key))
    u.searchParams.set("X-Amz-Expires", String(seconds))
    return (await s3.sign(u.toString(), { method, headers, aws: { signQuery: true, allHeaders: true } })).url
  }
  return {
    async put(folder: Folder, key: string, body: Uint8Array | string, contentType: string) {
      await call("PUT", folder, key, { body: body as BodyInit, headers: { "content-type": contentType } })
    },
    async get(folder: Folder, key: string) {
      const r = await call("GET", folder, key)
      if (r.status === 404 || !r.body) return null
      return { body: r.body, contentType: r.headers.get("content-type") ?? undefined }
    },
    // Size and type of a stored object, or null when there is none.
    async head(folder: Folder, key: string) {
      const r = await call("HEAD", folder, key)
      return r.status === 404 ? null : { size: Number(r.headers.get("content-length")), contentType: r.headers.get("content-type") ?? "" }
    },
    // S3 answers a DELETE of a missing key with 204, so a retried delete is a no-op.
    async delete(folder: Folder, key: string) {
      await call("DELETE", folder, key)
    },
    publicUrl: (key: string) => `${c.appOrigin}/media/${key}`,
    // Random, so a key cannot be guessed from anything the app shows.
    newKey: () => crypto.randomUUID(),
    // Presigned URLs let the browser talk to the bucket directly: file bytes never pass through the
    // Worker. The upload URL signs the content type, so a PUT with any other type is refused.
    uploadUrl: (folder: Folder, key: string, contentType: string) => presign("PUT", folder, key, UPLOAD_SECONDS, { "content-type": contentType }),
    downloadUrl: (folder: Folder, key: string) => presign("GET", folder, key, DOWNLOAD_SECONDS),
  }
}
export type Storage = ReturnType<typeof createStorage>
