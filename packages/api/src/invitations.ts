import { INVITATION_HOURS, OrgError } from "@workspace/auth"
import { and, eq, gt, invitation, member, user, type Db } from "@workspace/db"

import { checkCountLimit } from "./entitlements"
import type { Tx } from "./rate-limit"
import { loadSubscription } from "./subscriptions"

// Invitations are written here rather than through Better Auth so that the seat check, which counts
// pending invitations, runs in the same transaction as the write that takes the seat.

export type Invitation = typeof invitation.$inferSelect

export async function createInvitation(db: Db, input: { orgId: string; inviterId: string; email: string; role: "admin" | "member" }, inTx?: (tx: Tx, invitation: Invitation) => Promise<void>) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: member.id })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(and(eq(member.organizationId, input.orgId), eq(user.email, input.email)))
    if (existing) throw new OrgError("already_member")
    // A new invitation replaces any pending one for the same email, so it never costs a second seat.
    await tx.update(invitation).set({ status: "canceled" }).where(and(eq(invitation.organizationId, input.orgId), eq(invitation.email, input.email), eq(invitation.status, "pending")))
    const refusal = await checkCountLimit(tx as unknown as Tx, await loadSubscription(tx as unknown as Db, input.orgId), input.orgId, "seats")
    if (refusal) return { refusal }
    const [row] = await tx
      .insert(invitation)
      .values({ id: crypto.randomUUID(), organizationId: input.orgId, email: input.email, role: input.role, status: "pending", inviterId: input.inviterId, expiresAt: new Date(Date.now() + INVITATION_HOURS * 3_600_000) })
      .returning()
    await inTx?.(tx as unknown as Tx, row!)
    return { invitation: row! }
  })
}

export async function revokeInvitation(db: Db, orgId: string, id: string): Promise<boolean> {
  const rows = await db.update(invitation).set({ status: "canceled" }).where(and(eq(invitation.id, id), eq(invitation.organizationId, orgId), eq(invitation.status, "pending"))).returning({ id: invitation.id })
  return rows.length > 0
}

// The invitation's seat becomes the member's seat, so it is excluded from the count (adding 0).
export async function acceptInvitation(db: Db, input: { id: string; userId: string; email: string }) {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(invitation).where(eq(invitation.id, input.id))
    if (!row || row.status !== "pending" || row.expiresAt <= new Date()) throw new OrgError("invalid_invitation")
    if (row.email.toLowerCase() !== input.email.toLowerCase()) throw new OrgError("wrong_email")
    const [already] = await tx.select({ id: member.id }).from(member).where(and(eq(member.organizationId, row.organizationId), eq(member.userId, input.userId)))
    if (already) throw new OrgError("already_member")
    const refusal = await checkCountLimit(tx as unknown as Tx, await loadSubscription(tx as unknown as Db, row.organizationId), row.organizationId, "seats", 0)
    if (refusal) return { refusal }
    await tx.insert(member).values({ id: crypto.randomUUID(), organizationId: row.organizationId, userId: input.userId, role: row.role === "admin" ? "admin" : "member", createdAt: new Date() })
    await tx.update(invitation).set({ status: "accepted" }).where(eq(invitation.id, row.id))
    return { organizationId: row.organizationId }
  })
}

export const pendingInvitations = (db: Db, orgId: string) =>
  db
    .select({ id: invitation.id, email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt })
    .from(invitation)
    .where(and(eq(invitation.organizationId, orgId), eq(invitation.status, "pending"), gt(invitation.expiresAt, new Date())))
