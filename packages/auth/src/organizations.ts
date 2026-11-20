import { and, eq, isNull, member, organization, sql, user, type Db } from "@workspace/db"
import { t } from "@workspace/i18n"

import type { OrgRole } from "./access"

export type ActiveOrganization = { id: string; name: string; logo: string | null; role: OrgRole; suspended: boolean; noTrial: boolean }

// First word of the trimmed name; an empty name falls back to the email local part.
export function personalOrgName({ name, email }: { name: string; email: string }): string {
  const firstName = name.trim().split(/\s+/)[0] || email.split("@")[0] || email
  return t("organization.personalName", { firstName })
}

// Random, never derived from the person's name or email -- a 12-char hex slug.
export function newOrgSlug(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12)
}

type Person = { id: string; name: string; email: string }

// Creates the workspace with its owner and makes it the person's last used one. Runs inside the
// caller's transaction. Only a person's first workspace ever is trial-eligible: user.first_workspace_at
// is claimed atomically, so a second workspace (created by hand, or after leaving every other one)
// is always noTrial.
async function insertOrganization(tx: Db, person: Person, name: string): Promise<ActiveOrganization> {
  const firstEver = await tx
    .update(user)
    .set({ firstWorkspaceAt: new Date() })
    .where(and(eq(user.id, person.id), isNull(user.firstWorkspaceAt)))
    .returning({ id: user.id })
  const noTrial = firstEver.length === 0
  const orgId = crypto.randomUUID()
  await tx.insert(organization).values({ id: orgId, name, slug: newOrgSlug(), createdAt: new Date(), suspended: false, noTrial })
  await tx.insert(member).values({ id: crypto.randomUUID(), organizationId: orgId, userId: person.id, role: "owner", createdAt: new Date() })
  await tx.update(user).set({ lastActiveOrganizationId: orgId }).where(eq(user.id, person.id))
  return { id: orgId, name, logo: null, role: "owner", suspended: false, noTrial }
}

// Runs inside the action's transaction, after the change (the API writes its audit entry there), so
// the change and whatever it writes commit together or not at all.
export type InTx<T> = (tx: Db, info: T) => Promise<void>

// A workspace the person asked for by name ("create workspace").
export function createOrganization(db: Db, person: Person, name: string, inTx?: InTx<ActiveOrganization>): Promise<ActiveOrganization> {
  return db.transaction(async (raw) => {
    const tx = raw as unknown as Db
    const org = await insertOrganization(tx, person, name)
    await inTx?.(tx, org)
    return org
  })
}

// Personal workspace at a session with no membership: the first sign-up, an invite sign-up, or a
// person who has left every workspace. `for update` serializes two concurrent first sessions.
export async function ensurePersonalOrganization(db: Db, person: Person): Promise<ActiveOrganization> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from "user" where id = ${person.id} for update`)
    const resolved = await resolveActiveOrganization(tx as unknown as Db, person.id, null)
    return resolved ?? insertOrganization(tx as unknown as Db, person, personalOrgName(person))
  })
}

export async function markOrganizationDeleted(db: Db, orgId: string, inTx?: InTx<null>): Promise<void> {
  await db.transaction(async (raw) => {
    const tx = raw as unknown as Db
    await tx.update(organization).set({ deletedAt: new Date() }).where(eq(organization.id, orgId))
    await inTx?.(tx, null)
  })
}

// Every workspace the person belongs to, oldest membership first. Deleted workspaces are never
// listed, so neither the switcher nor the active-workspace fallback can select one.
export async function listMemberOrganizations(db: Db, userId: string): Promise<ActiveOrganization[]> {
  const rows = await db
    .select({ id: organization.id, name: organization.name, logo: organization.logo, role: member.role, suspended: organization.suspended, noTrial: organization.noTrial })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(and(eq(member.userId, userId), isNull(organization.deletedAt)))
    .orderBy(member.createdAt, member.organizationId)
  return rows.map((row) => ({ ...row, role: row.role as OrgRole }))
}

// The preferred workspace if the person still belongs to it, else their oldest owned workspace,
// else their oldest membership, else null.
export async function resolveActiveOrganization(db: Db, userId: string, preferredOrgId: string | null): Promise<ActiveOrganization | null> {
  const orgs = await listMemberOrganizations(db, userId)
  if (preferredOrgId) {
    const preferred = orgs.find((org) => org.id === preferredOrgId)
    if (preferred) return preferred
  }
  return orgs.find((org) => org.role === "owner") ?? orgs[0] ?? null
}

export class MemberError extends Error {
  constructor(public code: "not_found" | "forbidden" | "only_owner") {
    super(code)
  }
}

export async function listMembers(db: Db, orgId: string) {
  return db
    .select({ id: member.id, userId: member.userId, role: member.role, createdAt: member.createdAt, name: user.name, email: user.email, image: user.image })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, orgId))
    .orderBy(member.createdAt)
}

async function findMember(db: Db, orgId: string, memberId: string) {
  const [row] = await db.select({ id: member.id, userId: member.userId, role: member.role }).from(member).where(and(eq(member.id, memberId), eq(member.organizationId, orgId)))
  if (!row) throw new MemberError("not_found")
  return row
}

type MemberInfo = { userId: string; role: string }

// Nobody can remove the owner or change the owner's role; ownership moves only by transfer.
export async function removeMember(db: Db, orgId: string, memberId: string, inTx?: InTx<MemberInfo>): Promise<void> {
  await db.transaction(async (raw) => {
    const tx = raw as unknown as Db
    const target = await findMember(tx, orgId, memberId)
    if (target.role === "owner") throw new MemberError("forbidden")
    await tx.delete(member).where(eq(member.id, target.id))
    await inTx?.(tx, target)
  })
}

// The info passed to inTx carries the role before the change.
export async function setMemberRole(db: Db, orgId: string, memberId: string, role: "admin" | "member", inTx?: InTx<MemberInfo>): Promise<void> {
  await db.transaction(async (raw) => {
    const tx = raw as unknown as Db
    const target = await findMember(tx, orgId, memberId)
    if (target.role === "owner") throw new MemberError("forbidden")
    await tx.update(member).set({ role }).where(eq(member.id, target.id))
    await inTx?.(tx, target)
  })
}

export async function leaveOrganization(db: Db, orgId: string, userId: string): Promise<void> {
  const [row] = await db.select({ id: member.id, role: member.role }).from(member).where(and(eq(member.organizationId, orgId), eq(member.userId, userId)))
  if (!row) throw new MemberError("not_found")
  if (row.role === "owner") throw new MemberError("only_owner")
  await db.delete(member).where(eq(member.id, row.id))
}

// One transaction, demote first: the one-owner index never sees zero or two owners committed.
export async function transferOwnership(db: Db, orgId: string, ownerUserId: string, memberId: string, inTx?: InTx<MemberInfo>): Promise<void> {
  await db.transaction(async (tx) => {
    const target = await findMember(tx as unknown as Db, orgId, memberId)
    if (target.userId === ownerUserId) throw new MemberError("forbidden")
    const demoted = await tx
      .update(member)
      .set({ role: "admin" })
      .where(and(eq(member.organizationId, orgId), eq(member.userId, ownerUserId), eq(member.role, "owner")))
      .returning({ id: member.id })
    if (!demoted.length) throw new MemberError("forbidden")
    await tx.update(member).set({ role: "owner" }).where(eq(member.id, target.id))
    await inTx?.(tx as unknown as Db, target)
  })
}
