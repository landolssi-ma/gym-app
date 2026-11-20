import { createCms } from "@workspace/cms"
import { createSeo } from "@workspace/seo"

import { site } from "@/config/site"

import { getConfig } from "./config"

// Built per call: both are plain closures over config, and the CMS fetches go through the
// framework's data cache, so nothing worth keeping lives between requests.
export function getCms() {
  const c = getConfig()
  return createCms({ provider: c.CMS_PROVIDER, apiKey: c.CMS_API_KEY, apiUrl: c.CMS_API_URL })
}

export const getSeo = () => createSeo({ origin: getConfig().APP_ORIGIN, siteName: site.name })
