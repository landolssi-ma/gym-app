import type { Storage } from "@workspace/storage"

import { APP } from "./fake-deps"

// An in-memory bucket. Presigning is tested in packages/storage against the real signer; here the
// upload URL is opaque and the test "uploads" by writing the object directly.
export function fakeStorage() {
  const objects = new Map<string, { size: number; contentType: string }>()
  const at = (folder: string, key: string) => `${folder}/${key}`
  const storage = {
    newKey: () => crypto.randomUUID(),
    publicUrl: (key: string) => `${APP}/media/${key}`,
    uploadUrl: async (folder: string, key: string, contentType: string) => `https://bucket.test/${at(folder, key)}?put&type=${contentType}`,
    downloadUrl: async (folder: string, key: string) => `https://bucket.test/${at(folder, key)}?get`,
    head: async (folder: string, key: string) => objects.get(at(folder, key)) ?? null,
    delete: async (folder: string, key: string) => void objects.delete(at(folder, key)),
    put: async (folder: string, key: string, body: Uint8Array | string, contentType: string) => void objects.set(at(folder, key), { size: body.length, contentType }),
    get: async () => null,
  } as unknown as Storage
  return { storage, objects, upload: (uploadUrl: string, size: number, contentType: string) => objects.set(new URL(uploadUrl).pathname.slice(1), { size, contentType }) }
}
