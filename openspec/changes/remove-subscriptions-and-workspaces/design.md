# Design

## Context

The starter currently models every product operation around an active organization, with membership, billing and entitlements enforced in the API shell. See `proposal.md` for motivation and scope. This change removes that shared tenant layer and makes the signed-in account the data owner.

## Goals / Non-Goals

**Goals:**
- Directly scope product routes and records to `requireUser` rather than `requireActiveOrg`.
- Remove workspace, subscription, survey and entitlement dependencies from the signed-in journey.
- Preserve authentication, security settings, account deletion, platform admin support and audit logging.
- Remove pricing and checkout UI and routes from both the app and marketing site.

**Non-Goals:**
- Building a new gym domain.
- Preserving workspaces or subscriptions as inactive records.
- Replacing Dodo with a different payment system.
- Defining a custom multi-account or family-sharing model.

## Decisions

- Use the authenticated user id as the owner key for all account-owned product tables.
  - Rationale: it is available after `requireUser` and removes session workspace context.
  - Alternative: keep an implicit personal organization was rejected because it preserves the workspace model and requires the same switching/role machinery.

- Remove organization and subscription context from session state and API variables.
  - Rationale: no route should need an active organization id or paid-plan status.
  - Alternative: retain hidden organization data was rejected because stale tenant behavior would remain in the system.

- Replace workspace-scoped guards with account-scoped route lookups.
  - Rationale: every product record is owned by the account and requested ids must miss when owned by another account.
  - Alternative: look up a personal organization before each request was rejected as avoidable indirection.

- Remove billing packages, routes, jobs and public pricing flows rather than disabling them behind a flag.
  - Rationale: unused subscription code would keep a large broken dependency surface.
  - Alternative: feature flags were rejected because the request removes subscriptions and workspaces, not pauses them.

- Preserve better-auth session management and platform admin impersonation rules.
  - Rationale: authentication and account security remain valid starter capabilities.
  - Alternative: removing auth entirely was rejected because it would remove account identity and security.

- Replace the existing visual palette with semantic Sage, Beige, Ivory and Charcoal tokens.
  - Rationale: the four requested colours create a calm fitness identity that works for every user.
  - Alternative: keeping the existing botanical ink/ember palette was rejected because it conflicts with the requested brand direction.
  - Use `#71866D` for primary actions and emphasis, `#E8E5D9` for warm surfaces, `#F8F7F2` for the main canvas and `#292D29` for text and strong structure.
  - Keep authentication, gym setup and app imagery gender-neutral; do not use female-only models or wording as the default.

- Refresh public and signed-in surfaces without changing their established product logic.
  - Rationale: the reference image supplies layout and pacing inspiration, not a requirement to copy its feminine branding.
  - Preserve clear forms, visible labels, one primary action, responsive cards and established navigation behavior.

- Adapt account deletion to revoke sessions and remove account-owned records and files.
  - Rationale: with no shared workspaces, no ownership/member exception should block deletion.
  - Alternative: transfer or purge shared workspaces was rejected because shared workspaces no longer exist.

## Risks / Trade-offs

- [Existing organization-owned data could be lost during removal] → Export every workspace and its account-owned records to a dated JSON archive before the destructive migration.
- [Schema removal deletes starter demo and billing records] → Run migrations against a throwaway database first and document the backup requirement before production.
- [Removing public pricing may leave stale links or copy] → Update navigation, sitemap, structured data and i18n keys together.
- [Tests built around workspace fixtures become invalid] → Replace fixture helpers with account-owned seed data and remove workspace/billing test suites.

## Migration Plan

1. Replace the database schema and account ownership fields.
2. Remove workspace, membership, invitation, subscription and entitlement routes and jobs.
3. Rewrite signed-in shell navigation and post-sign-in routing.
4. Remove team, workspace, billing and pricing UI.
5. Rewrite seed data and tests for account-owned records.
6. Run migrations, unit tests, database tests, lint and typecheck before applying to deployed data.

## Open Questions
None. Existing workspace data will be exported before schema removal.
