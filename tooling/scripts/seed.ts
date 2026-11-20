// pnpm db:seed: local demo data. Safe to run again: every row has a fixed id and an existing row is
// left as it is. Every seeded person signs in with the email code (read from the dev log) or with
// the password below. Local only: refuses any database host but localhost.
import { hashPassword } from "@workspace/auth/password"
import { account, createDb, invitation, member, organization, projects, subscriptions, user } from "@workspace/db"

// The only place these credentials exist.
export const SEED_PASSWORD = "acme-local-demo-password"
const PEOPLE = [
  { id: "seed-owner", name: "Olivia Owner", email: "owner@example.com" },
  { id: "seed-member", name: "Max Member", email: "member@example.com" },
  { id: "seed-admin", name: "Ada Admin", email: "admin@example.com", role: "admin" },
] as const

const DAY = 86_400_000
const now = Date.now()
const survey = { completedAt: new Date(now - 20 * DAY).toISOString(), answers: { role: "founder", teamSize: "2_10", source: "referral" } }

process.loadEnvFile(new URL("../../apps/web/.env", import.meta.url).pathname)
const url = process.env.DATABASE_URL // eslint-disable-line turbo/no-undeclared-env-vars
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)) throw new Error("db:seed runs against local Postgres only (DATABASE_URL in apps/web/.env)")
const { db, end } = createDb(url)

try {
  const hash = await hashPassword(SEED_PASSWORD)
  const at = new Date(now - 30 * DAY)
  await db
    .insert(user)
    .values(PEOPLE.map((p) => ({ ...p, emailVerified: true, verifiedAt: at, createdAt: at, firstWorkspaceAt: p.id === "seed-owner" ? at : null })))
    .onConflictDoNothing()
  await db
    .insert(account)
    .values(PEOPLE.map((p) => ({ id: `${p.id}-credential`, accountId: p.id, providerId: "credential", userId: p.id, password: hash, createdAt: at, updatedAt: at })))
    .onConflictDoNothing()

  // The owner's first workspace is on its trial; the second is paid, with a member and a pending invitation.
  await db
    .insert(organization)
    .values([
      { id: "seed-trial", name: "Acme Trial", slug: "seed-acme-trial", createdAt: at, onboarding: survey },
      { id: "seed-active", name: "Acme Inc", slug: "seed-acme-inc", createdAt: at, noTrial: true, onboarding: survey },
    ])
    .onConflictDoNothing()
  await db
    .insert(member)
    .values([
      { id: "seed-m-owner-trial", organizationId: "seed-trial", userId: "seed-owner", role: "owner", createdAt: at },
      { id: "seed-m-owner-active", organizationId: "seed-active", userId: "seed-owner", role: "owner", createdAt: at },
      { id: "seed-m-member-active", organizationId: "seed-active", userId: "seed-member", role: "member", createdAt: at },
    ])
    .onConflictDoNothing()
  await db
    .insert(invitation)
    .values({ id: "seed-invite", organizationId: "seed-active", email: "invitee@example.com", role: "member", status: "pending", inviterId: "seed-owner", expiresAt: new Date(now + 48 * 3_600_000) })
    .onConflictDoNothing()
  await db
    .insert(subscriptions)
    .values([
      { organizationId: "seed-trial", providerSubscriptionId: "sub_seed_trial", providerCustomerId: "cus_seed", plan: "starter", interval: "month", status: "trialing", trialEndsAt: new Date(now + 10 * DAY), currentPeriodStart: new Date(now - 4 * DAY), currentPeriodEnd: new Date(now + 10 * DAY) },
      { organizationId: "seed-active", providerSubscriptionId: "sub_seed_active", providerCustomerId: "cus_seed", plan: "pro", interval: "month", status: "active", currentPeriodStart: new Date(now - 5 * DAY), currentPeriodEnd: new Date(now + 25 * DAY) },
    ])
    .onConflictDoNothing()
  await db
    .insert(projects)
    .values([
      { id: "00000000-0000-4000-8000-00000000a001", organizationId: "seed-active", name: "Website relaunch", description: "New marketing site and pricing page.", createdBy: "seed-owner" },
      { id: "00000000-0000-4000-8000-00000000a002", organizationId: "seed-active", name: "Customer onboarding", description: "Shorter first-run flow.", createdBy: "seed-member" },
      { id: "00000000-0000-4000-8000-00000000a003", organizationId: "seed-trial", name: "First project", createdBy: "seed-owner" },
    ])
    .onConflictDoNothing()
  console.log(`seeded: ${PEOPLE.map((p) => p.email).join(", ")} (password in tooling/scripts/seed.ts)`)
} finally {
  await end()
}
