import type { MetadataRoute } from "next"

import { getConfig } from "@/lib/config"

// Signed-in app, platform admin, auth flows and the API: nothing there is for search engines.
const DISALLOWED = ["/api/", "/admin", "/dashboard", "/settings", "/onboarding", "/post-sign-in", "/sign-in", "/reset-password"]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: DISALLOWED },
    sitemap: new URL("/sitemap.xml", getConfig().APP_ORIGIN).href,
  }
}
