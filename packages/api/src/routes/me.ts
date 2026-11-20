import { Hono } from "hono"
import { z } from "zod"

import { isLive, PLANS } from "@workspace/billing"
import { account, and, eq, organization } from "@workspace/db"

import { requireActiveOrg, requireActiveOrgAllowSuspended, requireUser, type GuardEnv } from "../guards"
import { missingRequired, validAnswer, type Onboarding } from "../survey"
import { json } from "../validate"
import { loadSubscription } from "../subscriptions"

// The one session, workspace and role read the shell renders from. It keeps answering for a member
// of a suspended workspace, so the shell can show the suspended state and the switcher still works.
export const me = new Hono<GuardEnv>().use(requireUser).get("/", requireActiveOrgAllowSuspended, async (c) => {
  const { deps, userId, session, org, orgRole } = c.var
  const [organizations, sub, isAdmin, [password], [o]] = await Promise.all([
    deps.auth.listOrganizations(userId),
    loadSubscription(deps.db, org.id),
    deps.auth.hasRole(userId, "admin"),
    deps.db.select({ id: account.id }).from(account).where(and(eq(account.userId, userId), eq(account.providerId, "credential"))).limit(1),
    deps.db.select({ onboarding: organization.onboarding }).from(organization).where(eq(organization.id, org.id)),
  ])
  return c.json({
    user: session.user,
    activeOrganization: org,
    organizations,
    orgRole,
    subscription: sub && { plan: sub.plan, status: sub.status },
    live: isLive(sub?.status),
    features: sub && isLive(sub.status) ? [...PLANS[sub.plan].features] : [],
    trialEligible: !org.noTrial && !sub,
    isAdmin,
    impersonating: deps.auth.isImpersonating(session),
    // Security settings offer "set a password" instead of "change" when there is none.
    hasPassword: !!password,
    // The workspace's survey; null until the first answer.
    onboarding: (o?.onboarding ?? null) as Onboarding | null,
  })
})
  // Each answer is saved as it is picked; `complete` needs every required answer and is set once.
  .put("/onboarding", requireActiveOrg, json(z.object({ answers: z.record(z.string(), z.string()), complete: z.literal(true).optional() })), async (c) => {
    const { deps, orgId } = c.var
    const { answers, complete } = c.req.valid("json")
    if (!Object.entries(answers).every(([id, value]) => validAnswer(id, value))) return c.json({ error: "invalid" }, 400)
    const [row] = await deps.db.select({ onboarding: organization.onboarding }).from(organization).where(eq(organization.id, orgId))
    const current = (row?.onboarding ?? { answers: {} }) as Onboarding
    const next: Onboarding = { ...current, answers: { ...current.answers, ...answers } }
    if (complete) {
      const missing = missingRequired(next.answers)
      if (missing.length) return c.json({ error: "incomplete", missing }, 400)
      next.completedAt ??= new Date().toISOString()
    }
    await deps.db.update(organization).set({ onboarding: next }).where(eq(organization.id, orgId))
    return c.json({ onboarding: next })
  })
