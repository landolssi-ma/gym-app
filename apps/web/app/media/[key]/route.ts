import { env, waitUntil } from "cloudflare:workers"

import { createApiHandler } from "@workspace/api/bootstrap"

import { site } from "@/config/site"

// Public avatars and logos, served by the API's /media route.
export const GET = (req: Request) => createApiHandler(env, { waitUntil, site })(req)
