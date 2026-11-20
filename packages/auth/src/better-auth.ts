import { betterAuth } from "better-auth/minimal"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin } from "better-auth/plugins/admin"
import { emailOTP } from "better-auth/plugins/email-otp"
import { haveIBeenPwned } from "better-auth/plugins/haveibeenpwned"
import { organization } from "better-auth/plugins/organization"

import { account, and, eq, isNull, sql, user, type Db } from "@workspace/db"
import * as schema from "@workspace/db"

import { ac, admin as adminRole, member, owner } from "./access"
import { hashPassword, verifyPassword } from "./password"
import { ensurePersonalOrganization, resolveActiveOrganization } from "./organizations"

export const SIGN_IN_CODE_MINUTES = 10
export const INVITATION_HOURS = 48
export const PASSWORD_RESET_MINUTES = 60

export type AuthConfig = {
  db: Db
  secret: string
  appOrigin: string
  cookiePrefix: string
  waitUntil: (p: Promise<unknown>) => void
  // Absent when Google sign-in is not configured.
  google?: { clientId: string; clientSecret: string }
  sendSignInCode: (data: { email: string; code: string; minutes: number }) => Promise<void>
  sendVerificationEmail: (data: { email: string; url: string }) => Promise<void>
  sendPasswordReset: (data: { email: string; url: string }) => Promise<void>
  // Called once per user, the first time their email is verified by any method.
  onUserVerified: (data: { id: string; email: string; name: string }) => Promise<void>
}

// Removes a password nobody has proven they own: a password set by someone else during an
// unverified sign-up must never sign in to the real owner's account. Better Auth already does this
// for an email-code sign-in (revokeUnprovenAccountAccess); this covers Google linking.
async function dropUnprovenPassword(db: Db, userId: string): Promise<void> {
  await db.delete(account).where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
}

// Claims user.verified_at; true only for the one call that set it.
async function claimFirstVerification(db: Db, userId: string): Promise<boolean> {
  const rows = await db
    .update(user)
    .set({ verifiedAt: new Date() })
    .where(and(eq(user.id, userId), eq(user.emailVerified, true), isNull(user.verifiedAt)))
    .returning({ id: user.id })
  return rows.length > 0
}

// Per request: db holds a request-scoped pg pool. Internal only -- never import this outside
// packages/auth. The facade in index.ts is the only thing other packages may call.
export function createBetterAuth(c: AuthConfig) {
  async function announceIfFirstVerification(u: { id: string; email: string; name: string; emailVerified?: boolean | null }) {
    if (!u.emailVerified || !(await claimFirstVerification(c.db, u.id))) return
    await c.onUserVerified({ id: u.id, email: u.email, name: u.name })
  }

  return betterAuth({
    baseURL: c.appOrigin,
    secret: c.secret,
    trustedOrigins: [c.appOrigin],
    database: drizzleAdapter(c.db, { provider: "pg", schema }),
    user: {
      additionalFields: {
        // input:false: Better Auth never accepts a client-supplied value, so only a direct DB write
        // can make someone a platform admin. requireAdmin still re-reads the column on every request.
        role: { type: "string", input: false, defaultValue: "user" },
        lastActiveOrganizationId: { type: "string", required: false, input: false },
      },
      // A verified user's new address takes effect only once a link sent to it is opened.
      changeEmail: { enabled: true },
    },
    socialProviders: c.google ? { google: c.google } : {},
    account: {
      // Google may link to an existing unverified account: the account.create hook below drops the
      // unproven password at that moment, so the link cannot hand the account to whoever set it.
      accountLinking: { requireLocalEmailVerified: false },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      // Password sign-in waits for a verified email (refused with EMAIL_NOT_VERIFIED, which resends).
      requireEmailVerification: true,
      autoSignIn: false,
      password: { hash: hashPassword, verify: verifyPassword },
      resetPasswordTokenExpiresIn: PASSWORD_RESET_MINUTES * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) => c.sendPasswordReset({ email: user.email, url }),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: ({ user, url }) => c.sendVerificationEmail({ email: user.email, url }),
    },
    plugins: [
      emailOTP({
        otpLength: 8,
        expiresIn: SIGN_IN_CODE_MINUTES * 60,
        allowedAttempts: 5,
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (type === "sign-in") await c.sendSignInCode({ email, code: otp, minutes: SIGN_IN_CODE_MINUTES })
        },
      }),
      haveIBeenPwned(),
      // Impersonation lasts at most 1 hour; impersonating another platform admin is refused.
      admin({ defaultRole: "user", adminRoles: ["admin"], impersonationSessionDuration: 60 * 60 }),
      organization({
        ac,
        roles: { owner, admin: adminRole, member },
        creatorRole: "owner",
        // Workspaces and invitations go through the starter's own routes: workspace creation decides
        // trial eligibility, and invitations check seats in the same transaction as the write.
        allowUserToCreateOrganization: false,
        schema: {
          organization: {
            additionalFields: {
              suspended: { type: "boolean", required: true, defaultValue: false, input: false },
              noTrial: { type: "boolean", required: true, defaultValue: false, input: false },
            },
          },
        },
      }),
    ],
    // The in-memory store is per isolate on Workers, so it would not hold. Every endpoint keeps the
    // default limit; the ones that send email or check a secret get a tighter one per client IP.
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: {
        "/get-session": false,
        "/sign-in/*": { window: 60, max: 10 },
        "/sign-up/*": { window: 60, max: 5 },
        "/email-otp/*": { window: 60, max: 5 },
        "/send-verification-email": { window: 60, max: 3 },
        "/request-password-reset": { window: 60, max: 3 },
        "/reset-password": { window: 60, max: 10 },
        "/change-password": { window: 60, max: 10 },
      },
    },
    // No cookie cache: every session read hits the database, so a revoked session or a ban takes
    // effect on the very next request.
    session: { cookieCache: { enabled: false }, additionalFields: { country: { type: "string", required: false, input: false } } },
    databaseHooks: {
      user: {
        create: { after: (u) => announceIfFirstVerification(u) },
        update: { after: (u) => announceIfFirstVerification(u) },
      },
      account: {
        create: {
          async after(created) {
            if (created.providerId === "credential") return
            const [owner] = await c.db.select({ emailVerified: user.emailVerified }).from(user).where(eq(user.id, created.userId))
            if (owner && !owner.emailVerified) await dropUnprovenPassword(c.db, created.userId)
          },
        },
      },
      session: {
        create: {
          // Every new session gets an active workspace: the one the person last used if they still
          // belong to it, else their personal workspace (created now if they have none).
          async before(session, ctx) {
            const [row] = await c.db
              .select({ id: user.id, name: user.name, email: user.email, lastActiveOrganizationId: user.lastActiveOrganizationId })
              .from(user)
              .where(eq(user.id, session.userId))
            const country = ctx?.headers?.get("cf-ipcountry") ?? null
            if (!row) return { data: { ...session, country } }
            const org = (await resolveActiveOrganization(c.db, row.id, row.lastActiveOrganizationId)) ?? (await ensurePersonalOrganization(c.db, row))
            return { data: { ...session, country, activeOrganizationId: org.id } }
          },
        },
        update: {
          // Every workspace switch records the person's last used workspace.
          async after(session) {
            const activeOrganizationId = (session as { activeOrganizationId?: string | null }).activeOrganizationId
            if (!activeOrganizationId) return
            await c.db
              .update(user)
              .set({ lastActiveOrganizationId: activeOrganizationId })
              .where(and(eq(user.id, session.userId), sql`${user.lastActiveOrganizationId} is distinct from ${activeOrganizationId}`))
          },
        },
      },
    },
    advanced: {
      // true would yield "__Secure-__Host-…"; secure comes from defaultCookieAttributes instead.
      useSecureCookies: false,
      cookiePrefix: c.cookiePrefix,
      defaultCookieAttributes: { secure: true, httpOnly: true, sameSite: "lax" },
      // Set by Cloudflare and not client-spoofable; x-forwarded-for is.
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
      // Rate-limit cleanup and similar work runs via waitUntil, off the request path.
      backgroundTasks: { handler: c.waitUntil },
      // One joined session+user query instead of two.
      database: { joins: true },
    },
  })
}

export type BetterAuthInstance = ReturnType<typeof createBetterAuth>
