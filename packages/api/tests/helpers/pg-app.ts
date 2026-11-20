import { createAuth } from "@workspace/auth"
import { createTestDb } from "@workspace/db/testing"

import { createApi, type Deps } from "../../src/index"
import { testBilling, webhook } from "./billing"
import { APP, COOKIE_PREFIX, fakeDeps } from "./fake-deps"

export const TOKEN = `${COOKIE_PREFIX}.session_token`

// The real API on a real (throwaway) Postgres, with emails captured instead of sent.
export function createPgApp(overrides: Partial<Deps> = {}) {
  const { db, end } = createTestDb()
  const codes = new Map<string, string>()
  const links: { kind: string; email: string; url: string }[] = []
  const verified: string[] = []
  const auth = createAuth({
    db,
    secret: "test-secret-0123456789-0123456789-abcdef",
    appOrigin: APP,
    cookiePrefix: COOKIE_PREFIX,
    waitUntil: (p) => void p,
    google: { clientId: "c", clientSecret: "s" },
    sendSignInCode: async ({ email, code }) => void codes.set(email, code),
    sendVerificationEmail: async ({ email, url }) => void links.push({ kind: "verify", email, url }),
    sendPasswordReset: async ({ email, url }) => void links.push({ kind: "reset", email, url }),
    onUserVerified: async ({ id }) => void verified.push(id),
  })
  // Invitation emails come from the team route through deps.mail.
  const mail = { send: async (template: string, email: string, data: Record<string, unknown>) => void (template === "teamInvite" && links.push({ kind: "invite", email, url: String(data.acceptUrl) })) }
  const deps = fakeDeps({ db, auth, mail: mail as never, billing: testBilling(), ...overrides })
  const app = createApi(() => deps)
  // Random per instance: Better Auth's rate-limit table is shared by every test file in a run.
  let ip = Math.floor(Math.random() * 60_000)

  // A fresh client ip per request keeps Better Auth's own rate limit out of the way.
  const call = (path: string, init: { method?: string; body?: unknown; cookie?: string; ip?: string } = {}) =>
    app.request(path.startsWith("http") ? path : `${APP}${path}`, {
      method: init.method ?? "GET",
      headers: {
        "cf-connecting-ip": init.ip ?? `10.${Math.floor(++ip / 62500) % 250}.${Math.floor(ip / 250) % 250}.${ip % 250}`,
        ...(init.cookie ? { cookie: init.cookie } : {}),
        ...(init.method && init.method !== "GET" ? { origin: APP, "content-type": "application/json" } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })

  // Live cookies from a response, as a Cookie header value.
  const jarFrom = (res: Response) =>
    res.headers
      .getSetCookie()
      .filter((c) => !/max-age=0/i.test(c))
      .map((c) => c.split(";")[0]!)
      .filter((pair) => pair.slice(pair.indexOf("=") + 1))
      .join("; ")

  async function signIn(email: string, staleCookie?: string): Promise<string> {
    const sent = await call("/api/auth/email-otp/send-verification-otp", { method: "POST", body: { email, type: "sign-in" } })
    if (sent.status !== 200) throw new Error(`send code: ${sent.status}`)
    const res = await call("/api/auth/sign-in/email-otp", { method: "POST", body: { email, otp: codes.get(email) }, cookie: staleCookie })
    if (res.status !== 200) throw new Error(`sign in: ${res.status} ${await res.text()}`)
    return jarFrom(res)
  }

  const expiresSessionToken = (res: Response) => {
    const last = res.headers.getSetCookie().filter((c) => c.startsWith(`${TOKEN}=`)).at(-1)
    return !!last && (/max-age=0/i.test(last) || new Date(/expires=([^;]+)/i.exec(last)?.[1] ?? Date.now()).getTime() < Date.now())
  }

  const email = (tag: string) => `${tag}-${crypto.randomUUID()}@test.invalid`

  // A charged (active) subscription for the workspace, through the real signed webhook.
  async function subscribe(orgId: string, plan: "starter" | "pro" | "business" = "pro") {
    const w = webhook({ type: "subscription.renewed", organizationId: orgId, plan })
    const res = await app.request(`${APP}/api/webhooks/billing`, { method: "POST", headers: w.headers, body: w.body })
    if (res.status !== 200) throw new Error(`subscribe: ${res.status}`)
  }

  // A signed-in owner of a subscribed personal workspace.
  async function owner(tag = "owner", plan?: "starter" | "pro" | "business") {
    const ownerEmail = email(tag)
    const jar = await signIn(ownerEmail)
    const orgId = ((await (await call("/api/organizations", { cookie: jar })).json()) as { activeId: string }).activeId
    await subscribe(orgId, plan)
    return { email: ownerEmail, jar, orgId }
  }

  return { db, end, auth, deps, app, call, signIn, jarFrom, expiresSessionToken, email, subscribe, owner, codes, links, verified }
}
