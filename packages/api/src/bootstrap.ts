import { z } from "zod"

import { createAi } from "@workspace/ai"
import { createAuth, type Auth } from "@workspace/auth"
import { createBilling, INTERVALS, PLAN_IDS, productKey } from "@workspace/billing"
import { createAnalytics, createLog } from "@workspace/core"
import { createDb } from "@workspace/db"
import { createJobs } from "@workspace/jobs"
import { createMail } from "@workspace/mail"
import { createStorage } from "@workspace/storage"

import { createApi, type Deps } from "./index"

const origin = z.string().refine((v) => URL.canParse(v) && new URL(v).origin === v, "must be a URL origin such as https://example.com")
const secret = z.string().min(1)
// An optional integration's value: blank or malformed reads as absent, so a half-filled .env turns
// the integration off instead of failing every route.
const optional = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined)
const isLocal = (appOrigin: string) => appOrigin.startsWith("http:")

// Exported so a test can check every key against apps/web/.env.example.
export const ApiEnvKeys = z.object({
  APP_ORIGIN: origin,
  SMOKE_TOKEN: z.string().min(16),
  // Hashes client IPs before they are stored as rate limit subjects.
  RATE_LIMIT_SALT: z.string().min(16),
  // Hyperdrive binding, not DATABASE_URL: DATABASE_URL is for drizzle-kit and scripts only.
  HYPERDRIVE: z.object({ connectionString: z.string().min(1) }),
  S3_ENDPOINT: z.url(),
  S3_ACCESS_KEY_ID: secret,
  S3_SECRET_ACCESS_KEY: secret,
  S3_BUCKET: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  MAIL_API_URL: z.url(),
  // Empty in local dev: emails are logged instead of sent.
  RESEND_API_KEY: z.string().default(""),
  INNGEST_DEV: z.enum(["0", "1"]),
  INNGEST_EVENT_KEY: secret,
  INNGEST_SIGNING_KEY: secret,
  BILLING_API_KEY: secret,
  BILLING_WEBHOOK_SECRET: secret,
  BILLING_TEST_MODE: z.enum(["0", "1"]),
  // Written by `pnpm billing:setup`: one Dodo product id per plan and interval.
  BILLING_PRODUCT_IDS: z
    .string()
    .transform((s, ctx) => {
      try {
        return JSON.parse(s) as unknown
      } catch {
        ctx.addIssue({ code: "custom", message: "must be JSON written by pnpm billing:setup" })
        return z.NEVER
      }
    })
    .pipe(z.object(Object.fromEntries(PLAN_IDS.flatMap((p) => INTERVALS.map((i) => [productKey(p, i), z.string().min(1)]))) as Record<ReturnType<typeof productKey>, z.ZodString>)),
  // BaseHub: blog, legal pages and changelog. The admin token is for `pnpm cms:setup` only.
  CMS_PROVIDER: z.enum(["basehub"]),
  CMS_API_KEY: secret,
  CMS_API_URL: z.url(),
  GOOGLE_CLIENT_ID: optional(secret),
  GOOGLE_CLIENT_SECRET: optional(secret),
  POSTHOG_KEY: optional(secret),
  POSTHOG_HOST: optional(z.url()),
  AI_GATEWAY_API_KEY: optional(secret),
  // A Vercel AI Gateway model id such as anthropic/claude-sonnet-5.
  AI_MODEL: optional(z.string().regex(/^[^/\s]+\/\S+$/, "must be a provider/model id")),
})

export const ApiEnvSchema = ApiEnvKeys
  // Deployed envs are always https, so only a local origin may skip Inngest signing or real email.
  .refine((c) => c.INNGEST_DEV === "0" || isLocal(c.APP_ORIGIN), { path: ["INNGEST_DEV"], message: "must be 0 unless APP_ORIGIN is a local http origin" })
  .refine((c) => c.RESEND_API_KEY !== "" || isLocal(c.APP_ORIGIN), { path: ["RESEND_API_KEY"], message: "is required unless APP_ORIGIN is a local http origin" })
  // Each optional integration is one object or undefined, never a half-set pair of raw keys.
  .transform(({ GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, POSTHOG_KEY, POSTHOG_HOST, AI_GATEWAY_API_KEY, AI_MODEL, ...c }) => ({
    ...c,
    google: GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET ? { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET } : undefined,
    posthog: POSTHOG_KEY && POSTHOG_HOST ? { key: POSTHOG_KEY, host: POSTHOG_HOST } : undefined,
    ai: AI_GATEWAY_API_KEY && AI_MODEL ? { apiKey: AI_GATEWAY_API_KEY, model: AI_MODEL } : undefined,
  }))
export type ApiEnv = z.output<typeof ApiEnvSchema>

// Names each bad key and why, never its value: values may be secrets.
export function parseApiEnv(env: object): ApiEnv {
  const r = ApiEnvSchema.safeParse(env)
  if (r.success) return r.data
  const problems = new Map<string, string>()
  for (const issue of r.error.issues) {
    const key = issue.path.join(".")
    const missing = issue.path.reduce<unknown>((o, k) => (o as Record<PropertyKey, unknown> | undefined)?.[k], env) === undefined
    if (!problems.has(key)) problems.set(key, missing ? "is missing" : issue.message)
  }
  throw new Error(`Invalid config: ${[...problems].map(([key, why]) => `${key}: ${why}`).join("; ")}`)
}

// A user's first verified email: the user.created event and the welcome email. A failure of either
// is logged and never fails the sign-in.
export async function announceUser(d: Pick<Deps, "jobs" | "mail" | "log"> & { appOrigin: string }, u: { id: string; email: string }): Promise<void> {
  const results = await Promise.allSettled([
    d.jobs.send("user.created", { userId: u.id, email: u.email }, `user.created:${u.id}`),
    d.mail.send("welcome", u.email, { appUrl: `${d.appOrigin}/dashboard` }),
  ])
  for (const r of results) if (r.status === "rejected") d.log.error("user_created_followup", { err: r.reason })
}

// Product identity from apps/web/config/site.ts; packages never import from apps/*.
export type SiteConfig = {
  name: string
  logoPath: string
  supportEmail: string
  mailFrom: string
  cookiePrefix: string
  emailTheme: { background: string; text: string; button: string; buttonText: string; buttonBorder: string; font: string }
}
export type HandlerOptions = { waitUntil: Deps["waitUntil"]; site: SiteConfig }

// Composition root: the only place packages/api builds Deps. Per request -- no module-level pool,
// no module-level provider instance.
export function createDeps(c: ApiEnv, opts: HandlerOptions): Deps {
  const { db, end } = createDb(c.HYPERDRIVE.connectionString)
  const log = createLog({ requestId: crypto.randomUUID() })
  const { site } = opts
  const mail = createMail({
    apiKey: c.RESEND_API_KEY,
    apiUrl: c.MAIL_API_URL,
    from: site.mailFrom,
    replyTo: site.supportEmail,
    appOrigin: c.APP_ORIGIN,
    brand: { name: site.name, logoUrl: `${c.APP_ORIGIN}${site.logoPath}`, supportEmail: site.supportEmail, theme: site.emailTheme },
    log,
  })
  const jobs = createJobs({ appId: site.cookiePrefix.replace(/^__Host-/, ""), eventKey: c.INNGEST_EVENT_KEY, signingKey: c.INNGEST_SIGNING_KEY, isDev: c.INNGEST_DEV === "1" })
  let auth: Auth | undefined
  return {
    config: { appOrigin: c.APP_ORIGIN, smokeToken: c.SMOKE_TOKEN, rateLimitSalt: c.RATE_LIMIT_SALT, cookiePrefix: site.cookiePrefix },
    db,
    mail,
    billing: createBilling({ apiKey: c.BILLING_API_KEY, webhookSecret: c.BILLING_WEBHOOK_SECRET, testMode: c.BILLING_TEST_MODE === "1", productIds: c.BILLING_PRODUCT_IDS }),
    storage: createStorage({ endpoint: c.S3_ENDPOINT, accessKeyId: c.S3_ACCESS_KEY_ID, secretAccessKey: c.S3_SECRET_ACCESS_KEY, bucket: c.S3_BUCKET, appOrigin: c.APP_ORIGIN }),
    jobs,
    get auth() {
      return (auth ??= createAuth({
        db,
        secret: c.BETTER_AUTH_SECRET,
        appOrigin: c.APP_ORIGIN,
        cookiePrefix: site.cookiePrefix,
        waitUntil: opts.waitUntil,
        google: c.google,
        sendSignInCode: ({ email, code, minutes }) => mail.send("signInCode", email, { code, minutes }),
        sendVerificationEmail: ({ email, url }) => mail.send("verifyEmail", email, { url }),
        sendPasswordReset: ({ email, url }) => mail.send("passwordReset", email, { url }),
        onUserVerified: async (u) => opts.waitUntil(announceUser({ jobs, mail, log, appOrigin: c.APP_ORIGIN }, u)),
      }))
    },
    analytics: c.posthog && createAnalytics(c.posthog),
    ai: c.ai && createAi({ ...c.ai, log }),
    log,
    waitUntil: opts.waitUntil,
    close: end,
  }
}

const handlers = new WeakMap<object, (req: Request) => Promise<Response>>()

// Entry point for apps/web's route: called with the raw `cloudflare:workers` env. Memoized per env
// object -- the binding is stable for the life of the isolate, so config is parsed and the Hono app
// built once per isolate, while deps are still built per request.
export function createApiHandler(env: object, opts: HandlerOptions): (req: Request) => Promise<Response> {
  const cached = handlers.get(env)
  if (cached) return cached
  const config = parseApiEnv(env)
  const api = createApi(() => createDeps(config, opts))
  const handler = async (req: Request) => api.fetch(req)
  handlers.set(env, handler)
  return handler
}
