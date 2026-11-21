# Tasks

## 1. Remove workspace and subscription infrastructure

- [x] 1.1 Export or archive existing workspace and subscription data, then replace the baseline schema with account-owned gym data and remove organization, membership, invitation, subscription and entitlement tables; verify migrations and ownership tests against a throwaway database.
- [x] 1.2 Remove workspace, team, invitation, billing, webhook, checkout and entitlement routes and packages; verify route-table and API tests no longer expose those endpoints.
- [x] 1.3 Remove workspace/session variables, organization guards and subscription checks from Hono, Better Auth integration and account flows; verify account API routes and account deletion work without organization ownership.

## 2. Rework first-launch and signed-in access

- [x] 2.1 Preserve the gym profile as the sole first-launch step and make post-sign-in routing account-first; verify incomplete profiles gate the app and completed profiles reach their requested path or dashboard.
- [x] 2.2 Remove workspace switcher, team, billing and plan navigation from the shell and user menu; verify profile, security and direct app navigation remain accessible.
- [ ] 2.3 Remove billing, pricing, plans and checkout pages from app and public navigation; verify those URLs are no longer public or redirected to removed product assumptions.

## 3. Apply the Sage visual system

- [ ] 3.1 Replace shared UI tokens with Sage `#71866D`, Beige `#E8E5D9`, Ivory `#F8F7F2` and Charcoal `#292D29`; verify no fixed brand hex values outside the token source.
- [ ] 3.2 Rework the sign-in, sign-up and gym-profile surfaces as a clear responsive two-area layout inspired by the reference, with one primary action and neutral fitness imagery; verify 1440, 1024, 768 and 390 layouts.
- [ ] 3.3 Rework the app shell, profile, security and settings surfaces with the same palette, typography, spacing, cards and controls; verify mobile navigation, focus states and no horizontal overflow.
- [ ] 3.4 Rework public marketing surfaces that remain in scope so the removed pricing journey is absent and the Sage identity is consistent; verify public-path and metadata tests.

## 4. Test and verify

- [ ] 4.1 Update fixtures and tests for account-owned users and gym profiles, removing workspace/billing assertions; verify `pnpm test` passes.
- [ ] 4.2 Run database migration tests, typecheck, lint and build; verify the application starts locally with billing-free configuration.

## Workflow follow-up

- Request `/openspec-apply-change` when implementation should start.
