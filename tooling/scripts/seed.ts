// pnpm db:seed: local demo data. Safe to run again: every row has a fixed id and an existing row is
// left as it is. Every seeded person signs in with the email code (read from the dev log) or with
// the password below. Local only: refuses any database host but localhost.
import { hashPassword } from "@workspace/auth/password"
import { account, createDb, projects, user } from "@workspace/db"

// The only place these credentials exist.
export const SEED_PASSWORD = "acme-local-demo-password"
const PEOPLE = [
  { id: "seed-owner", name: "Olivia Owner", email: "owner@example.com" },
  { id: "seed-member", name: "Max Member", email: "member@example.com" },
  { id: "seed-admin", name: "Ada Admin", email: "admin@example.com", role: "admin" },
] as const

const DAY = 86_400_000
const now = Date.now()
process.loadEnvFile(new URL("../../apps/web/.env", import.meta.url).pathname)
const url = process.env.DATABASE_URL // eslint-disable-line turbo/no-undeclared-env-vars
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)) throw new Error("db:seed runs against local Postgres only (DATABASE_URL in apps/web/.env)")
const { db, end } = createDb(url)

try {
  const hash = await hashPassword(SEED_PASSWORD)
  const at = new Date(now - 30 * DAY)
  await db
    .insert(user)
    .values(PEOPLE.map((p) => ({ ...p, emailVerified: true, verifiedAt: at, createdAt: at })))
    .onConflictDoNothing()
  await db
    .insert(account)
    .values(PEOPLE.map((p) => ({ id: `${p.id}-credential`, accountId: p.id, providerId: "credential", userId: p.id, password: hash, createdAt: at, updatedAt: at })))
    .onConflictDoNothing()

  await db
    .insert(projects)
    .values([
      { id: "00000000-0000-4000-8000-00000000a001", userId: "seed-owner", name: "Website relaunch", description: "New marketing site and help pages.", createdBy: "seed-owner" },
      { id: "00000000-0000-4000-8000-00000000a002", userId: "seed-member", name: "Customer onboarding", description: "Shorter first-run flow.", createdBy: "seed-member" },
      { id: "00000000-0000-4000-8000-00000000a003", userId: "seed-owner", name: "First project", createdBy: "seed-owner" },
    ])
    .onConflictDoNothing()
  console.log(`seeded: ${PEOPLE.map((p) => p.email).join(", ")} (password in tooling/scripts/seed.ts)`)
} finally {
  await end()
}
