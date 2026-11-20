import type { Deps } from "../../src/index"

export const APP = "https://app.test"
export const COOKIE_PREFIX = "__Host-acme"

const noop = () => {}
// A dependency a test must never touch: any property read throws and is recorded.
export function forbidden(name: string, accesses: string[] = []) {
  return new Proxy({}, { get(_t, key) { accesses.push(`${name}.${String(key)}`); throw new Error(`${name} used: ${String(key)}`) } })
}

export function fakeDeps(overrides: Partial<Deps> = {}): Deps {
  return {
    config: { appOrigin: APP, smokeToken: "test-smoke-token-0001", rateLimitSalt: "test-rate-limit-salt-0001", cookiePrefix: COOKIE_PREFIX },
    db: forbidden("db") as Deps["db"],
    auth: forbidden("auth") as Deps["auth"],
    mail: { send: async () => {} },
    storage: forbidden("storage") as Deps["storage"],
    billing: forbidden("billing") as Deps["billing"],
    // 204 marks a request that reached the Inngest handler.
    jobs: { define: noop, send: async () => {}, serve: () => async () => new Response(null, { status: 204 }) } as unknown as Deps["jobs"],
    log: { info: noop, warn: noop, error: noop },
    waitUntil: noop,
    close: async () => {},
    ...overrides,
  }
}
