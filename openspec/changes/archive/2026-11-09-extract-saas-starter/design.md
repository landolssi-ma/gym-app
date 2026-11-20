# Design

## Context

See proposal.md for the motivation and scope.

- **Source:** `~/Projects/presell-page-builder` at commit `43cb8fe`. The working tree there has uncommitted changes, so read files with `git show 43cb8fe:<path>` (or a clean checkout of that commit), never from the working tree. The source is read-only.
- **Target:** this repository, `~/Projects/saas-starter-kit`, which currently holds only `openspec/` and `.claude/`. It starts a fresh git history; nothing from the source history is carried over.
- **Source shape:** pnpm + Turborepo monorepo, one app (`apps/web`) and 19 packages, about 96k lines of TypeScript, 185 test files. About 15-20k lines are reusable SaaS infrastructure; the rest is the Umiplex product.
- **Runtime (unchanged):** vinext 1.2 (Next 16 App Router on Vite) on one Cloudflare Worker. Neon Postgres through a Hyperdrive binding, R2 through the S3 API, Inngest for jobs, Resend for email, Dodo for billing, BaseHub for marketing content.
- **Products built from this starter deploy on Cloudflare.** That fixes the runtime and keeps the Workers rules of the source (below).

## Goals / Non-Goals

**Goals:**
- Port the source's infrastructure code with its tests, so the starter inherits fixes the source already paid for.
- Clone the source's visual design exactly. Pages the source does not have (profile, security, workspace settings) are built from the same components and tokens.
- One obvious place for each kind of change: plans in `plans.ts`, branding in one site config file plus `globals.css`, navigation in one config file, strings in `en.json`.
- A product feature touches the same four places every time, with the same name (see Conventions).

**Non-Goals:**
- A plugin system or upstream-sync promise. Products fork the starter and own it.
- A free plan.
- Multiple billing providers. Dodo only; the provider code stays in one file so another provider can be added later.
- Multiple languages. The i18n mechanism stays; English only.
- Hosting customer content on a second origin (the source's `cdn.` split). Documented as a recipe only.
- Optional modules (API keys, 2FA, in-app notifications, outgoing webhooks, error tracking). Later changes.

## Decisions

### Runtime: keep vinext on Cloudflare Workers

Products deploy on Cloudflare, and the source app already runs there with its lessons recorded. The Workers rules carry over unchanged:
- DB client, Better Auth instance and config are built per request; nothing that does I/O is module-level.
- Only `apps/web` reads env (from `cloudflare:workers`); packages receive a typed config through `createX(config)`, validated with Zod once.
- `wrangler.jsonc` holds no vars and exactly one binding (`HYPERDRIVE`); everything else comes from `.env` locally and Worker secrets when deployed.
- `proxy.ts`, not `middleware.ts`. No `"use cache"` or PPR. The vinext module workaround in `apps/web/vite.config.ts` is ported as is.
- Deploy is a push to `main` through Cloudflare Workers Builds; `pnpm secrets:deploy` uploads secrets.

Alternative considered: official Next.js through the OpenNext Cloudflare adapter. It would match what AI agents know better, but it means porting a working app to a different build pipeline. Rejected for now.

### Design: clone, don't redesign

Port `packages/ui` (shadcn components and `globals.css` tokens), `apps/web/components/shell`, `apps/web/components/marketing` and the shared page layouts as they are. Product names and copy become placeholders in `en.json`; layout, spacing, colors and components stay identical. The token lint rule (no hex literals or arbitrary Tailwind values) stays, so a rebrand is a `globals.css` edit. No dark mode, because the source has none.

### Architecture

Request flow: a page or a client hook calls `/api/*` through the typed Hono client. The Hono app (`packages/api`) runs the middleware chain, then the guards, then the route handler, which uses db, mail, storage and jobs.

- **API:** Hono at `/api/*`, typed client `hc<AppRoutes>` behind `apiFetch` (adds `x-org-id`, handles 401, 409 and 402), React Query hooks per feature. Kept from the source because it gives end-to-end types, testable routes without Next, and a ready path to a public API.
- **Server components** read through the in-process API call (`callApiInProcess`, `getMeResult`), never by querying the DB directly.
- **Middleware chain:** per-request deps, duplicate auth cookie check, exact `Origin` check on state-changing requests (webhook and Inngest paths exempt by exact path), then routers. One error handler.
- **Guards:** `requireUser`, `requireActiveOrg` (the server resolves the active workspace from the session and re-checks membership on every request; the `x-org-id` header only detects a stale tab and returns 409 `org_changed`), `requireOrgRole`, `requireAdmin` (fresh DB read), `forbidWhileImpersonating`.
- **One error format:** `{ error: "<code>" }` with the right status. Codes map to messages in one place on the client (`errors.<code>` in `en.json`). 402 means "upgrade required" and opens the upgrade dialog from `apiFetch`, so features never handle it themselves.
- **Input validation:** a small `json(schema)` helper over `hono/validator` and Zod, so `hc` sees typed inputs. Replaces the source's manual `safeParse` in each route.

### Packages

Each package owns one concern and its provider SDK; packages never import from `apps/*`. Small server utilities are merged to cut per-package boilerplate.

| Package | Contents | Source |
|---|---|---|
| `api` | Hono app, middleware, guards, routers, Inngest functions, `bootstrap.ts` (env schema and deps) | `packages/api` minus product routes |
| `auth` | Better Auth config, facade, access control, client helpers, proxy cookie check | `packages/auth` |
| `billing` | `plans.ts`, entitlements, reducer, Dodo adapter, product and webhook sync | `packages/billing` |
| `db` | Drizzle schema per area, migrations, seed, test helpers | `packages/db` |
| `jobs` | Inngest client, typed event catalog | `packages/jobs` |
| `mail` | Resend over fetch, shared layout, templates | `packages/mail` |
| `storage` | S3 API over aws4fetch, presigned URLs | `packages/storage` |
| `core` | logs, `safeFetch`, credential encryption, PostHog capture | `packages/logs`, `packages/utils`, `packages/analytics` |
| `ui` | shadcn components, tokens, hooks | `packages/ui` |
| `i18n` | `en.json`, `t()` | `packages/i18n` |
| `seo` | metadata, OG image, structured data | `packages/seo` |
| `cms` | BaseHub client for blog, legal and changelog | `packages/cms`, product content types removed |

Removed: `ai`, `blocks`, `crawler`, `shopify`.

### Directory layout

```
saas-starter-kit/
+-- AGENTS.md                 stack, map, conventions, pitfalls (CLAUDE.md imports it)
+-- README.md                 quickstart
+-- docker-compose.yml        local Postgres
+-- .github/workflows/ci.yml  lint, typecheck, test, db tests
+-- docs/recipes/             add a module, add a plan limit, add an email, add a job
+-- apps/web/
|   +-- app/                  marketing pages, sign-in, (app) shell, (backoffice) admin, api route
|   +-- features/<name>/      index.ts, services.ts, hooks.ts, keys.ts, components/
|   +-- components/shell/     sidebar, header, user menu, workspace switcher
|   +-- components/marketing/ marketing shell and sections
|   +-- config/               site.ts (name, logo, support email, cookie prefix), nav.ts
|   +-- lib/                  config, api client, in-process API call
|   +-- proxy.ts
|   +-- wrangler.jsonc
+-- packages/                 api auth billing db jobs mail storage core ui i18n seo cms
+-- tooling/                  eslint, typescript, scripts
```

### Conventions

- **Same name everywhere.** A module `projects` lives at `packages/db/src/schema/projects.ts`, `packages/api/src/routes/projects.ts`, `apps/web/features/projects/` and `apps/web/app/(app)/(shell)/projects/`.
- **Every workspace-owned table** has `organization_id` (foreign key, cascade delete, indexed). The source's `schema-ownership.test.ts` becomes a rule: a table without it fails the test unless listed as global.
- **Gating is server-side and atomic**, checked and written in one transaction. UI-only gating is a bug.
- **Product code reacts to starter events** (`user.created`, `organization.deleted`, `billing/subscription.changed`) with Inngest functions; it does not edit starter routes.
- **Feature imports** go through the feature's `index.ts` (ESLint boundary rule kept).
- **Tests** live in `<package>/tests/`, mirroring `src/`. DB tests run against a throwaway Postgres with every migration applied (`packages/db/tests/pg-test.sh`).
- **Comments explain why.** The source's planning IDs (`F21-07`, `D-13`, `G-05-08`, `261101-ebr/R4`) are dropped when porting; the reasoning they annotate is kept.

### Auth

Port `packages/auth` (Better Auth 1.7) with these changes:
- Keep: Google, 8-digit email code, email + password with HIBP, password reset, admin plugin (ban, impersonation), organization plugin, DB-backed rate limits, the session hook that sets the active workspace (last used, else personal workspace), the facade that keeps Better Auth types inside the package.
- Add: required email verification for password sign-up (the source does not require it, which allows pre-account-takeover when Google sign-in is used with the same email later).
- Remove: magic link (kept in the source only for links already sent).
- Change: turn off Better Auth's cookie cache, so every session read is fresh; then drop the hand-maintained list of 14 session-free auth paths in `packages/api/src/index.ts`. Keep the impersonation and revoke rules there.
- Keep PBKDF2 password hashing (`packages/auth/src/password.ts`): Workers' native PBKDF2 is capped at 100,000 iterations, and JS scrypt costs isolate CPU. See Risks.
- Cookie prefix comes from site config instead of the hardcoded `__Host-umiplex`.
- Timestamps in auth tables become `timestamptz`, like the app tables.

### Workspaces

- A personal workspace is created at the first session (source behavior). Users can also create more workspaces (the source sets `allowUserToCreateOrganization: false`; the starter allows it through a starter-owned route).
- Roles: `owner`, `admin`, `member`. The source has only owner and member. Admin manages members and invitations; only the owner manages billing, transfers ownership and deletes the workspace. Permissions are defined in one file (`packages/auth/src/access.ts`).
- The platform admin is a separate concept (`user.role = 'admin'`), always called "platform admin" in code and UI.
- Seat limit comes from the plan (`limits.seats`) instead of the hardcoded `SEAT_LIMIT = 3` in `packages/api/src/team.ts`; pending invitations count as seats.
- Keep from the source: invitations by email with accept page, revoke, leave, transfer ownership, soft-delete with purge job, suspension by platform admin, switcher with cross-tab sync and stale-tab detection.

### Billing and entitlements

- **Plans live in code.** `packages/billing/src/plans.ts` defines each plan: monthly and yearly price, trial days, `limits` (for example `seats`, `projects`) and `features`. `pnpm billing:setup` creates or updates Dodo products from it (generalized from `syncProducts` and `ensureWebhook` in `packages/billing/src/dodo.ts`). No free plan: a workspace without a live subscription has no access to the app beyond billing, settings and the funnel.
- **Trial:** once per user, on the workspace created at sign-up (source rule: other workspaces are marked `noTrial`). Dodo has no native trialing status; port `deriveSub`, which derives it locally.
- **Webhooks:** port the flow of `packages/api/src/webhooks.ts`: verify the signature, dedupe by webhook id, normalize, reduce into the subscription row with the pure `reduce()`, decide lifecycle emails from the transition, send after commit. Remove the product reactions (page suspension, claim dispatch) and instead send an Inngest event `billing/subscription.changed` with the previous and next status.
- **Add:** customer portal (the source has no way for a past-due customer to update a card), yearly prices, provider customer id on the subscription row.
- **Keep:** checkout with trial eligibility, change plan with price preview, cancel at period end, resume, `billing:simulate` and `billing:sign` scripts for local webhooks, trial reminder cron.
- **Entitlements** (`packages/billing/src/entitlements.ts`), replacing the product-shaped `can()`:
  - `can(subscription, feature)`: pure check against the plan's `features`.
  - Count limits (`seats`, `projects`): counted inside the write transaction.
  - Usage meters: one `INSERT ... ON CONFLICT DO UPDATE` per period that increments and checks in the same statement (the source's rate limit and usage pattern).
  - Any refusal returns 402 with the reason.

### Onboarding funnel

The generic version of the source's flow:

1. Landing page CTA.
2. Sign-up on `/sign-in` (email code, Google or password), then `/post-sign-in`.
3. Survey, using the source's questionnaire component. Questions are defined in a config file; answers are stored in `organization.onboarding` (jsonb with `completedAt`), as in the source (`PUT /api/me/onboarding`).
4. `/plans`: plan cards, trial checkout through Dodo.
5. `/checkout-success`: waits for the webhook to activate the subscription (port the activation poll).
6. Dashboard.

`OnboardingGate` keeps sending a workspace without a subscription to `/plans`.

### Marketing site

- Keep: marketing shell, header, footer, mobile nav, the section components, pricing page, legal pages, blog, changelog, help and contact, sitemap, OG images, structured data.
- Pricing cards are generated from `plans.ts`.
- BaseHub stays for blog, legal pages and changelog. Remove the product content types (examples, comparisons, generator pages, glossary) and their routes.
- Product-only pieces are replaced, not deleted from the layout: the product-URL hero form becomes a sign-up CTA in the same design.

### App shell and shared pages

- Port the shell (sidebar, mobile nav sheet, header actions, user menu, workspace heading, switcher, impersonation banner, suspended state). Nav items come from `apps/web/config/nav.ts`.
- Port: team page, billing page (with cancel, change plan, delete account and delete workspace dialogs), team invite accept page.
- New, in the same design: profile (name, avatar, email), security (password, active sessions, sign out everywhere), workspace (name, logo, delete).

### File uploads

- `packages/storage` gains presigned PUT and GET URLs (aws4fetch query signing).
- Flow: `POST /api/files` creates a `files` row and returns a presigned PUT URL; the browser uploads straight to R2; `POST /api/files/:id/complete` checks the object (size, content type) and marks it ready.
- Files are private by default and read through short-lived presigned GET URLs. Avatars and workspace logos are public, served through the ported `/media/[...key]` route.
- Remove the Cloudflare cache purge (only needed for published customer pages).

### Admin backoffice and audit log

- Port `(backoffice)/admin` users (search, ban, sessions, impersonation) and organizations (suspend, members, subscription). Add a subscriptions list. Remove generations, samples and product content screens.
- New `audit_logs` table, written in the same transaction as the action: member invited, removed or role changed, ownership transferred, workspace created, deleted or suspended, user banned, impersonation started or stopped, plan changed, canceled or resumed. Admin viewer only.

### Email

- Port the Resend-over-fetch client and the templates: sign-in code, password reset, team invite, welcome, trial reminder, subscription started, subscription canceled, payment failed. Add verify email. Remove pages-suspended.
- One shared layout (logo, body, button, footer) replaces the markup each template repeats today. Brand values come from site config instead of being copied by hand from `globals.css`.
- In development, when `RESEND_API_KEY` is empty, emails are logged (recipient, subject, links) instead of sent.

### Data model

Starter tables (all timestamps `timestamptz`):

| Table | Purpose | Notes |
|---|---|---|
| `user`, `session`, `account`, `verification`, `rate_limit` | Better Auth | Port; `user.role`, ban fields, `last_active_organization_id` kept |
| `organization` | Workspace | Port; keep `suspended`, `no_trial`, `deleted_at`, `onboarding` |
| `member` | Membership | Role check becomes `owner`, `admin`, `member` |
| `invitation` | Invitations | Port |
| `subscriptions` | One per workspace | Port; add `provider_customer_id` and `interval` (`month`, `year`) |
| `usage` | Meters | Generalized: primary key `(organization_id, meter, period_start)`, `count` |
| `webhook_events` | Webhook dedupe | Rename of `webhook_dedupe` |
| `rate_limits` | Fixed-window limits | Port; the `type` enum becomes a free-text bucket |
| `files` | Uploads | New: organization, key, name, content type, size, visibility, status, uploaded by |
| `audit_logs` | Audit trail | New: organization, actor, impersonator, action, target type and id, metadata, IP, created at |
| `projects` | Reference module | New, deletable |

Product tables are not ported. Migrations start from one fresh baseline; the source's 21 migrations and per-migration dry-run scripts are not carried over. IDs: Better Auth's text ids stay; app tables use `uuid` with a random default.

### Developer experience

- `pnpm bootstrap`: copy `.env.example` to `apps/web/.env`, generate `BETTER_AUTH_SECRET`, start local Postgres, migrate, seed. Named `bootstrap`, not `setup`: `pnpm setup` and `pnpm deploy` are pnpm built-ins that run instead of a package script, so the starter defines neither (deploy is a push to `main`; `apps/web` keeps `deploy:manual` for a one-off `wrangler deploy`).
- `pnpm dev` runs the app and the Inngest dev server.
- Seed: an owner, a member and a platform admin; two workspaces (one with a trialing subscription, one active with members and a pending invitation); sample projects. Credentials live in the seed file only.
- Optional integrations (Google, PostHog) turn off when their env is absent, like the source's Shopify config. Local dev needs Dodo test keys only for a real checkout; `billing:simulate` covers webhooks without them.
- Ported scripts: `billing-setup`, `billing-setup-tunnel`, `billing-simulate`, `billing-sign`, `env-sync`, `smoke`. Dropped: quality harness, `shots`, google fonts.
- `AGENTS.md` rewritten for the starter: stack, package map, conventions, pitfalls (same format as the source's `CLAUDE.md`). Port the source's Better Auth and ponytail skills from `.claude/skills`.
- CI on GitHub Actions: install, lint, typecheck, test, DB tests. Deploy stays on Workers Builds.

### Build order

Tasks follow this order, because each step depends on the ones before it:

1. Repository scaffold: git init, workspace, tooling, app skeleton on vinext and Workers, env schema, CI.
2. `db`, `core`, `jobs`, `mail`, `storage` clients ported; API foundation (middleware, error format, health).
3. Auth, then workspaces and guards.
4. Billing and entitlements.
5. App shell and shared pages.
6. Onboarding funnel.
7. Marketing site.
8. File uploads.
9. Admin backoffice and audit log.
10. Reference module, seed, recipes, `AGENTS.md`, README.

## Risks / Trade-offs

- [PBKDF2 at 100,000 iterations is below OWASP's 600,000 for PBKDF2-SHA256] → Accepted because of the Workers cap. The stored hash includes its iteration count, so it can be raised later by rehashing at sign-in. Breached-password check, rate limits and email-code sign-in reduce the exposure.
- [vinext is young, and AI agents know standard Next.js better] → Pin versions, keep the source's `AGENTS.md` warning about Next differences, port the Vite workaround unchanged.
- [Turning off the cookie cache adds a DB read to session checks] → Measure in the auth step; if it matters, keep the source's approach (cache on, fresh read in guards, path allowlist). **Measured (task 3.3):** 1.9 ms per session read on local Postgres (50 reads, `session-revocation.pg.test.ts`); cache stays off. Re-measure against Neon through Hyperdrive after the first deploy.
- [Ported shared code still carries product assumptions] → Before finishing, search the repo for product terms (`umiplex`, `page`, `brand`, `generation`, `claim`, `sample`, `shopify`) and remove what is left; port the source tests for every ported module.
- [One large change] → Tasks are grouped by the build order; `/openspec-apply-change` resumes at the first unchecked task, so implementation can span many sessions.
- [Presigned browser uploads need CORS on the R2 bucket] → Document the bucket CORS rule in setup and check it in the smoke script.
- [Marketing content depends on BaseHub] → Limited to blog, legal and changelog; pages render with an empty state when the CMS has no entries.

## Migration Plan

No data migration: new project. First deploy of a product built on the starter:

1. Create the Hyperdrive config and put its id in `wrangler.jsonc`.
2. Fill `.env.production` and run `pnpm secrets:deploy`.
3. Run `pnpm db:migrate:prod` against Neon.
4. Run `pnpm billing:setup --mode live` to create products and the webhook.
5. Push to `main`; run `pnpm smoke:prod`.

Rollback: Workers version rollback in Cloudflare; migrations are additive.

## Open Questions

Resolved with the user on 2026-11-08 (task 1.1).

- Placeholder product name used in copy, emails and the cookie prefix.
  - **Answer:** "Acme". Cookie prefix `__Host-acme`, support email `support@example.com`, sender `Acme <hello@example.com>` (`example.com` is reserved, so the placeholder never sends real mail).
- Default plan names and prices in `plans.ts` (data only, changed per product).
  - **Answer:** three plans, all with a 14-day trial; yearly price is 10 times monthly.

    | Plan | Monthly | Yearly | Seats | Projects | Features |
    |---|---|---|---|---|---|
    | `starter` | $19 | $190 | 1 | 3 | none |
    | `pro` | $79 | $790 | 5 | 25 | `export` |
    | `business` | $199 | $1,990 | 20 | unlimited | `export` |

    No meter is defined by default; meter behavior is tested with test-only plans. `export` gates the reference module's CSV export of projects.
- Default survey questions (config only).
  - **Answer:** "What best describes you?" (Founder, Developer, Marketer, Other); "How big is your team?" (Just me, 2–10, 11–50, 51+); "How did you hear about us?" (Google search, Social media, Friend or colleague, Other).
