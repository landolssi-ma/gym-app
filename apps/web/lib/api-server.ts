import { env, waitUntil } from "cloudflare:workers"
import { headers } from "next/headers"
import { cache } from "react"

import { createApiHandler } from "@workspace/api/bootstrap"
import { isSignedIn } from "@workspace/auth/proxy"

import { site } from "@/config/site"
import type { Me } from "@/features/auth"

import { getConfig } from "./config"

// Builds a same-process Request for an in-process Hono call. Only the inbound `cookie` header is
// ever forwarded -- no other header (origin, x-org-id, ...) -- so a server component can't grant
// itself a privilege the real request didn't carry. `cookie === null` sets no cookie header at
// all, never an empty string.
export function buildInProcessRequest(origin: string, path: string, cookie: string | null): Request {
  const headersInit: HeadersInit = {}
  if (cookie !== null) headersInit.cookie = cookie
  return new Request(new URL(path, origin), { headers: headersInit })
}

// The one place a Server Component reads through the API: never by querying the DB directly, so
// every read passes the same guards as a browser request.
export async function callApiInProcess(path: string): Promise<Response> {
  const cookie = (await headers()).get("cookie")
  const api = createApiHandler(env, { waitUntil, site })
  return api(buildInProcessRequest(getConfig().APP_ORIGIN, path, cookie))
}

// The sign-in page's "already signed in" question: an authoritative get-session, so the sign-in
// page and a protected layout can never send a visitor back and forth.
export async function isSignedInFresh(): Promise<boolean> {
  const api = createApiHandler(env, { waitUntil, site })
  return isSignedIn(buildInProcessRequest(getConfig().APP_ORIGIN, "/", (await headers()).get("cookie")), site.cookiePrefix, api)
}

export type MeResult = { ok: true; data: Me } | { ok: false; status: number; error: unknown }

// React.cache: the (app) and (shell) layouts and pages all read /api/me, for one in-process call per request.
export const getMeResult = cache(async (): Promise<MeResult> => {
  const res = await callApiInProcess("/api/me")
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: unknown }
    return { ok: false, status: res.status, error: body.error }
  }
  return { ok: true, data: (await res.json()) as Me }
})
