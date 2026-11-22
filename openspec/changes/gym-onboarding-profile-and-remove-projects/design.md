# Design

## Context

The starter currently exposes account settings and a workspace-owned onboarding survey. The gym profile belongs to the signed-in account, while the existing Projects module is a starter reference feature. See `proposal.md` for the behavior change and the delta specs for the contract.

## Goals / Non-Goals

**Goals:**
- Store one gym profile per user and enforce its required fields on the server.
- Send incomplete-profile users to the profile flow before normal app pages render.
- Let users update their profile without exposing or changing another account's data.
- Remove every public and persisted part of the Projects reference module.

**Non-Goals:**
- Use measurements for calculations or recommendations in this change.
- Remove the workspace model, billing or the existing organization settings.
- Replace the profile fields with a multi-step onboarding wizard.

## Decisions

- Add an account-owned `gym_profiles` table keyed by the Better Auth user id with cascading deletion. This keeps profile ownership independent from active workspaces and matches account ownership rules.
- Store sex, age, height, weight, waist, optional hip, sport level, goal and sessions-per-week as typed columns. Add database constraints for supported enums and numeric ranges; API Zod schemas remain the user-facing validation boundary.
- Treat profile completion as the absence of null required values, not as a separate mutable flag. A valid update writes all required values together and the read API exposes `complete`.
- Add `GET /api/gym-profile` and `PUT /api/gym-profile`. Both routes use `requireUser` and scope reads and writes by `c.var.userId`; impersonation follows the existing credential restrictions.
- Surface `profileComplete` through `/api/me` and gate app rendering in the existing app layout and routing. This avoids separate database reads in server components and keeps the shell's one-read pattern.
- Reuse the profile settings page for editing and add a dedicated first-launch route or view that submits the same profile contract. The UI will use existing form, label and string-catalog patterns.
- Remove Projects from the database schema and export list, Hono mount and route file, navigation config, app feature and route, i18n keys and associated tests. Remove its table from the baseline migration rather than inventing a runtime compatibility layer.
- Ranges are implementation constraints: age 13-120, height 80-250 cm, weight 20-500 kg, waist and hip 40-300 cm, and sessions 1-7. These can be adjusted in a later change if product requirements become stricter.

## Risks / Trade-offs

- Profile values can be sensitive health-adjacent data → Keep them account-owned, never log payload values and return 404 for another user's profile.
- Existing signed-in users have no profile row → Treat the row as incomplete and redirect them once on normal app access.
- Removing Projects leaves stale references in tests or exports → Validate exact route coverage, navigation, database exports and package feature exports as part of the implementation tasks.
- Numeric units and sex choices may need localization or product-specific terminology → Keep the enums and labels in the i18n catalog and Zod contract; add no analytics or derived recommendations.

## Migration Plan

1. Add the gym profile schema and routes.
2. Remove Projects schema exports and every caller.
3. Regenerate the single baseline migration and reset or migrate local Postgres for verification.
4. Verify first-launch redirects and profile editing before the final test run.
5. Rollback means restoring the prior code and baseline migration; because Projects is a starter feature, no production user data migration is included.
