# Proposal

## Why

The starter currently requires a workspace and a paid subscription for product use. For this gym application, authentication should identify the current person while product access and data belong directly to that person, without workspace or billing setup.

## What Changes

- Remove workspace creation, switching, invitations, roles, team pages, ownership transfer, workspace suspension and workspace settings.
- Remove subscriptions, plan definitions, checkout, webhooks, trials, entitlement limits, billing pages and provider setup.
- Make signed-in users enter the gym profile once after authentication, then continue directly to the product without workspace or plan selection.
- Adapt the app shell, profile/security/account flows and navigation for a single signed-in user.
- Apply a gender-neutral Sage/Beige/Ivory/Charcoal visual system across authentication, onboarding, app shell, settings and marketing surfaces.
- Adapt platform administration and audit behavior by removing workspace and subscription management.
- Remove subscription and workspace assumptions from public marketing and reduce pricing/checkout copy to non-billing content.
- **BREAKING:** Workspace-scoped APIs and data, organization ids, active-workspace sessions, plan entitlements and billing routes will no longer exist.

## Capabilities

### New Capabilities

- `single-user-access`: Defines account-owned access and data as the default for a signed-in person, with no workspace or plan context.

### Modified Capabilities

- `organizations`: Workspace creation, membership, roles and isolation requirements are removed.
- `billing`: Subscription, checkout, provider webhook and lifecycle requirements are removed.
- `entitlements`: Plan and subscription gating requirements are removed.
- `onboarding-funnel`: Sign-up and sign-in go directly to the product instead of survey and plans steps.
- `app-shell`: Shell navigation and settings no longer expose workspace switching, team or billing.
- `user-auth`: Account deletion no longer depends on workspace ownership or shared-workspace membership.
- `admin-backoffice`: Platform administration no longer manages workspaces or subscriptions.
- `audit-log`: Workspace, membership and billing audit actions are removed.
- `api-foundation`: Workspace-scoped public and guarded API behavior is replaced by account-owned behavior.
- `marketing-site`: Pricing and paid-plan marketing are removed from the public product journey.

## Impact

- Database: remove organization, membership, invitation, subscription, survey and workspace-ownership dependencies; migrate product data to account ownership.
- Auth: remove active organization state and workspace roles from session and navigation behavior.
- API: remove organization billing, team, workspace and entitlement routes; remove workspace guards and organization ids from product routes.
- UI: remove workspace switcher, team/settings/billing pages and plan-gated navigation; keep profile, security and direct product pages.
- Visual identity: use Sage `#71866D`, Beige `#E8E5D9`, Ivory `#F8F7F2` and Charcoal `#292D29` as semantic design tokens.
- Packages: remove Dodo billing and workspace-specific billing dependencies from runtime flows; preserve provider code only if reused outside this change.
- OpenSpec: replaces the starter's workspace/billing contract with the account-owned `single-user-access` contract.
