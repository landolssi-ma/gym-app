import { env } from "cloudflare:workers"

import { parseApiEnv, type ApiEnv } from "@workspace/api/bootstrap"

export type Config = ApiEnv

// The Worker env object is stable for the life of the isolate, so it is parsed once per env
// object; a changed env (a new deploy) is a new object and is parsed again.
const cache = new WeakMap<object, Config>()

export function getConfig(): Config {
  let c = cache.get(env)
  if (!c) cache.set(env, (c = parseApiEnv(env)))
  return c
}

// The only config values the browser may see. Everything else stays on the server; the
// client secrets check (tooling/scripts/check-client-secrets.ts) fails the build otherwise.
export type PublicConfig = { appOrigin: string; posthog: Config["posthog"]; googleEnabled: boolean; aiEnabled: boolean }

export function getPublicConfig(): PublicConfig {
  const c = getConfig()
  return { appOrigin: c.APP_ORIGIN, posthog: c.posthog, googleEnabled: !!c.google, aiEnabled: !!c.ai }
}
