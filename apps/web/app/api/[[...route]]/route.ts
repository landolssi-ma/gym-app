import { env, waitUntil } from "cloudflare:workers"

import { createApiHandler } from "@workspace/api/bootstrap"

import { site } from "@/config/site"

const handle = (req: Request) => createApiHandler(env, { waitUntil, site })(req)

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as OPTIONS }
