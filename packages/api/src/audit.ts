import type { Context } from "hono"

import { auditLogs, type Db } from "@workspace/db"

import type { GuardEnv } from "./guards"
import type { Tx } from "./rate-limit"

// Every action the audit-log spec names. Adding one here is how a new action becomes auditable.
export type AuditAction =
  | "member.invited"
  | "member.removed"
  | "member.role_changed"
  | "ownership.transferred"
  | "workspace.created"
  | "workspace.deleted"
  | "workspace.suspended"
  | "workspace.unsuspended"
  | "user.banned"
  | "user.unbanned"
  | "session.revoked"
  | "impersonation.started"
  | "impersonation.stopped"
  | "subscription.plan_changed"
  | "subscription.canceled"
  | "subscription.resumed"

export type AuditEntry = {
  organizationId: string | null
  action: AuditAction
  targetType: "user" | "member" | "invitation" | "workspace" | "session" | "subscription"
  targetId: string
  metadata?: Record<string, unknown>
}
export type AuditActor = { actorId: string; impersonatorId: string | null; ip: string | null }

// Who acts, on whose behalf and from where, from the signed-in request.
export const auditActor = (c: Context<GuardEnv>): AuditActor => ({
  actorId: c.var.session.user.id,
  impersonatorId: c.var.session.session.impersonatedBy ?? null,
  // Set by Cloudflare, never by the client (see rate-limit.ts).
  ip: c.req.header("cf-connecting-ip") ?? null,
})

// Details must never carry credentials or card data; a key that looks like one is a bug.
const SECRET_KEY = /pass|secret|token|otp|code|card|cvc|cvv|iban|key/i
function assertNoSecrets(value: unknown, path = "metadata"): void {
  if (!value || typeof value !== "object") return
  for (const [k, v] of Object.entries(value)) {
    if (SECRET_KEY.test(k)) throw new Error(`audit ${path}.${k} looks like a secret`)
    assertNoSecrets(v, `${path}.${k}`)
  }
}

// Takes the caller's transaction: the entry commits with the action or not at all, and a failed
// write fails the action.
export async function writeAudit(tx: Tx | Db, actor: AuditActor, entry: AuditEntry): Promise<void> {
  assertNoSecrets(entry.metadata)
  await tx.insert(auditLogs).values({ ...actor, ...entry, metadata: entry.metadata ?? {} })
}
