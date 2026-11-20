# Add a plan limit

Plans live in [`packages/billing/src/plans.ts`](../../packages/billing/src/plans.ts). A limit is checked on the
server, inside the write it protects; hiding a button is never enough.

There are two kinds:

- **Count limit**: how many of something a workspace may have at once (seats, projects). Checked by
  counting inside the write transaction.
- **Usage meter**: how many units a workspace may use per billing period (exports, API calls).
  Counted and checked in one statement; resets each period.

## Count limit

1. Add it to `limits` in the plan type and to every plan in `plans.ts` (`null` means unlimited):

   ```ts
   limits: { seats: number | null; projects: number | null; reports: number | null }
   ```

2. Tell [`packages/api/src/entitlements.ts`](../../packages/api/src/entitlements.ts) how to count it:

   ```ts
   async reports(db, orgId) {
     const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(reports).where(eq(reports.organizationId, orgId))
     return row?.n ?? 0
   },
   ```

   Counted limits automatically appear in `GET /api/billing` and block downgrades below current usage.

3. Check it in the same transaction as the insert:

   ```ts
   const result = await deps.db.transaction(async (tx) => {
     const refusal = await checkCountLimit(tx, await loadSubscription(tx, orgId), orgId, "reports")
     if (refusal) return { refusal }
     return { row: (await tx.insert(reports).values({ organizationId: orgId, ...input }).returning())[0] }
   })
   if ("refusal" in result) return c.json(result.refusal, 402)
   ```

   `checkCountLimit` locks the workspace row, so concurrent requests cannot both take the last slot.

## Usage meter

1. Add it to `meters` on each plan that allows it: `meters: { exports: 100 }`. A plan without the
   meter does not limit it.
2. Call `useMeter` before the work, and return its refusal:

   ```ts
   const refusal = await useMeter(deps.db, await loadSubscription(deps.db, orgId), orgId, "exports")
   if (refusal) return c.json(refusal, 402)
   ```

## Test it

Write a `*.pg.test.ts` (run with `pnpm test:db`) that fills the limit and expects the next request to
answer `402` with `{ error: "upgrade_required", reason: "reports", used, limit }`. Add a concurrent
case for the last slot. See [`entitlements.pg.test.ts`](../../packages/api/tests/entitlements.pg.test.ts).

## The client side

Nothing to do: every 402 `upgrade_required` opens the upgrade dialog through `apiFetch`. Add a
message for the reason under `upgrade.reasons` in `en.json` so the dialog names it.
