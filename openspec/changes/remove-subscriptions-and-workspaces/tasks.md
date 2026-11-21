# Tasks

## 1. Database and ownership

- [x] 1.1 Add an export command for all workspace data and verify it produces a complete dated JSON archive before schema removal; then replace workspace-owned and subscription-owned schema with account-owned fields and regenerate the baseline migration.
- [x] 1.2 Rewrite seed and database fixtures to create account-owned demo data, and verify `pnpm db:seed` and `pnpm test:db` succeed.
- [x] 1.3 Remove organization, invitation, membership, subscription, survey and workspace purge data paths, and verify no schema or package tests reference them.

## 2. API account scoping

- [x] 2.1 Replace `requireActiveOrg` and organization variables with authenticated account ownership on product routes, and verify cross-account ids return 404.
- [x] 2.2 Remove workspace, team, invitation, organization, billing, entitlement and checkout routes, and verify the route table and unauthorized-route tests pass.
- [x] 2.3 Remove workspace and subscription jobs and provider events, and verify the Inngest function inventory contains no removed workspace or billing functions.

## 3. Authentication and account deletion

- [x] 3.1 Replace post-sign-in workspace/survey/plan routing with return-path or dashboard routing, and verify first sign-in opens the product.
- [x] 3.2 Remove active-workspace session behavior and workspace lifecycle events, and verify auth tests pass.
- [x] 3.3 Rewrite account deletion to revoke sessions and remove account-owned data and files, and verify confirmation and cross-account behavior.

## 4. App shell and navigation

- [x] 4.1 Remove workspace switcher, team, workspace settings and billing navigation, and verify the shell shows only account and product destinations.
- [x] 4.2 Remove workspace, team and billing pages and features, and verify no app route renders removed navigation or plan context.
- [x] 4.3 Update i18n keys and shell copy, and verify missing workspace/billing text keys fail no longer and `pnpm typecheck` passes.

## 5. Marketing and backoffice

- [x] 5.1 Remove pricing, plans, checkout and paid-plan copy from public routes and navigation, and verify public-route tests pass.
- [x] 5.2 Remove workspace and subscription views from the backoffice, and verify platform admin pages expose accounts and audit only.
- [x] 5.3 Restrict audit entries to account security actions and remove workspace/member/billing actions, and verify audit tests cover the new action set.

## 6. Integration verification

- [x] 6.1 Run unit, database, lint and typecheck suites, and verify there are no workspace, billing or entitlements references outside intentionally archived or migration documentation.
- [ ] 6.2 Launch the app and verify sign-in opens the dashboard directly, account-only routes work, and removed pages/links are absent.
