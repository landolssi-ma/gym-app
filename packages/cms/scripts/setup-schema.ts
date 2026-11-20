// pnpm --filter @workspace/cms cms:setup [--dry-run]
// Creates (or updates, idempotently by apiName) the BaseHub collections and commits them.
import { createCmsAdmin } from "../src/basehub"
import { COLLECTIONS } from "./schema"

if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify(COLLECTIONS, null, 2))
} else {
  const adminApiKey = process.env.CMS_ADMIN_API_KEY
  if (!adminApiKey) throw new Error("CMS_ADMIN_API_KEY is not set (apps/web/.env)")
  const apiUrl = process.env.CMS_API_URL
  if (!apiUrl) throw new Error("CMS_API_URL is not set (apps/web/.env)")
  await createCmsAdmin({ adminApiKey, apiUrl }).transaction(COLLECTIONS, "Set up CMS collections")
  console.log(`created/updated ${COLLECTIONS.length} collections`)
}
