import { NextResponse, type NextRequest } from "next/server"

import { hasSessionCookie } from "@workspace/auth/proxy"

import { site } from "./config/site"
import { CONTENT_PATH_PREFIXES, STATIC_PUBLIC_PATHS } from "./lib/public-paths"

// Pages an anonymous visitor may open. /api/* answers 401 itself; /media/* serves public avatars and logos.
const PUBLIC_PATHS = new Set<string>([...STATIC_PUBLIC_PATHS, "/sign-in", "/reset-password"])

function isPublicPath(path: string): boolean {
  return (
    PUBLIC_PATHS.has(path) ||
    CONTENT_PATH_PREFIXES.some((p) => path.startsWith(p)) ||
    // Per-route OG images of public pages (e.g. /blog/x/opengraph-image).
    (path.endsWith("/opengraph-image") && isPublicPath(path.slice(0, -"/opengraph-image".length) || "/")) ||
    path.startsWith("/api/") ||
    path.startsWith("/media/")
  )
}

// A static file (last segment has an extension, e.g. /favicon.ico) is never sent to sign-in.
const isStaticAsset = (path: string) => path.slice(path.lastIndexOf("/") + 1).includes(".")

// Cookie presence only, no database read: signed-out visitors go to sign-in with a return path. The
// API's guards re-read the session on every request and remain the real enforcement point.
export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  if (!isPublicPath(path) && !isStaticAsset(path) && !hasSessionCookie(req, site.cookiePrefix)) {
    return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(path + req.nextUrl.search)}`, req.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ["/((?!_next/static).*)"] }
