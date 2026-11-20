# SaaS starter kit

A starter for SaaS products on Cloudflare: auth, workspaces, billing, emails, app shell, marketing site and admin, ported from a production app. A product forks it and owns the copy; there is no upstream sync.

What the starter does is defined by the OpenSpec specs in `openspec/specs/` (and, until it is archived, the change in `openspec/changes/`). All work goes through an OpenSpec change.

## This is NOT the Next.js you know

The app runs on **vinext**: Next 16 App Router reimplemented on Vite, deployed to one Cloudflare Worker. APIs, conventions and file structure may differ from your training data and from standard Next.js. Before writing app code, read the relevant guide in `apps/web/node_modules/next/dist/docs/`, write to the Next 16 public API, and check vinext's behavior when something looks off. Heed deprecation notices.

Turborepo may also differ from what you know: read `node_modules/turbo/docs/` before changing `turbo.json` or turbo commands.

## Technology stack

- **Runtime:** vinext 1.2 (Next 16 App Router on Vite) on one Cloudflare Worker. `proxy.ts`, never `middleware.ts`. No `"use cache"` and no PPR.
- **Config:** every setting and secret lives in `apps/web/.env` locally and in Worker secrets when deployed (`pnpm secrets:deploy`). `.env.example` lists every key.
- **API:** Hono at `/api/*` in `packages/api`, called through the typed `hc` client.
- **DB:** Neon Postgres via `pg` + Drizzle through the Cloudflare Hyperdrive binding; local Docker Postgres (`docker compose up -d`, host port 5433) in dev. `DATABASE_URL` is for drizzle-kit and scripts only.
- **Storage:** R2 over the S3 API (aws4fetch). No R2 bindings.
- **Auth:** Better Auth (Google, emailed 8-digit code, email + password with breached-password check). Passwords hash with native PBKDF2, never the default scrypt.
- **Jobs:** Inngest. **Billing:** Dodo Payments. **Email:** Resend over fetch. **Content:** BaseHub. **Analytics:** PostHog over fetch (optional). **AI:** Vercel AI SDK through the Vercel AI Gateway (optional).
- **Tests:** Vitest. **Deploy:** push to `main` (Cloudflare Workers Builds).

## Workers rules

Lessons already paid for. Breaking one is a bug.

- **Per request, never module-level:** the DB client, the Better Auth instance and the config are built per request. Nothing that does I/O lives at module level; Workers forbid cross-request I/O.
- **Only `apps/web` reads env** (from `cloudflare:workers`). Each package receives a typed config through its factory, `createX(config)`, validated with Zod once, and never reads `process.env` or `cloudflare:workers` itself.
- **`apps/web/wrangler.jsonc` holds no vars and exactly one binding, `HYPERDRIVE`.** Everything else comes from `.env` or Worker secrets.
- **Keep the vinext module workaround** (`appSourceModules` in `apps/web/vite.config.ts`) as it is: vinext's page handler otherwise intercepts root-relative client module URLs. A new top-level `apps/web` source folder that client code imports goes into its folder list (and wrangler's `run_worker_first` exclusions), or it 404s in dev. Do not add `rsc()` to the Vite plugins; vinext registers it and a second copy breaks the build.
- **Deploy is a push to `main`** through Cloudflare Workers Builds. `pnpm secrets:deploy` uploads `.env.production` as Worker secrets.

## Package map

`apps/web` is the only app: routes, UI, env reading, and wiring packages together. Each package owns one concern and its provider SDK; packages never import from `apps/*`.

| Package | Owns |
|---|---|
| `api` | Hono app, middleware, guards, routers, Inngest functions, env schema and per-request deps (`bootstrap.ts`) |
| `auth` | Better Auth config, facade, access control, client helpers, proxy cookie check |
| `billing` | `plans.ts`, entitlements, subscription reducer, Dodo adapter, product and webhook sync |
| `db` | Drizzle schema per area, migrations, seed, test helpers |
| `jobs` | Inngest client, typed event catalog |
| `mail` | Resend over fetch, shared layout, templates |
| `storage` | S3 API over aws4fetch, presigned URLs |
| `ai` | Vercel AI SDK over the AI Gateway: text and structured output, time limit, `AiError`, content-free logs |
| `core` | logs, `safeFetch`, credential encryption, PostHog capture |
| `ui` | shadcn components, design tokens (`globals.css`), hooks |
| `i18n` | `en.json` strings, `t()` |
| `seo` | metadata, OG images, structured data |
| `cms` | BaseHub client for blog, legal pages and changelog |

Tooling lives in `tooling/` (`eslint`, `typescript`, `scripts`).

## Where things go

- Product identity (name, logo, support email, sender, cookie prefix, email colors): `apps/web/config/site.ts`.
- Design values: tokens in `packages/ui` `globals.css`, never hex literals or arbitrary Tailwind values (lint fails).

## Configuration

- Every env key is declared once, with Zod, in [`packages/api/src/bootstrap.ts`](packages/api/src/bootstrap.ts) and listed in [`apps/web/.env.example`](apps/web/.env.example) (a test fails if one is missing). Errors name the key, never its value.
- An optional integration (Google, PostHog, AI) becomes one object or `undefined` in the parsed config; a blank or half-set integration is off, never an error.
- The browser sees only [`getPublicConfig()`](apps/web/lib/config.ts) (app origin, PostHog key and host, whether Google and AI are on). `pnpm check:secrets` ([script](tooling/scripts/check-client-secrets.ts)) builds with sentinel secrets and fails if one reaches the client bundle or a page.

## API conventions

Request flow: page or hook → typed `hc` client ([`lib/hc-client.ts`](apps/web/lib/hc-client.ts)) through [`apiFetch`](apps/web/lib/api-fetch.ts) → Hono app ([`packages/api/src/index.ts`](packages/api/src/index.ts)) → middleware → guards → route → db, mail, storage, jobs.

- **One error format:** `{ "error": "<code>" }` with the matching status; unknown routes are 404 `not_found`, unhandled errors 500 `internal` (stack logged, never sent). Each code has a message at `errors.<code>` in `en.json`, read through [`errorMessage`](apps/web/lib/errors.ts).
- **Shared statuses are handled once, in `apiFetch`:** 401 → sign-in with a return path, 409 `org_changed` → reload into the current workspace, 402 `upgrade_required` → the upgrade dialog. Features never handle these themselves.
- **Validation:** every route validates its input with [`json(schema)` / `valid(target, schema)`](packages/api/src/validate.ts); invalid input is 400 `invalid` before the handler runs.
- **Middleware** ([`middleware.ts`](packages/api/src/middleware.ts)): duplicate auth cookies → 400 `duplicate_cookie`; non-GET requests need `Origin` equal to `APP_ORIGIN` → else 403 `forbidden_origin`. Only `/api/webhooks/billing` and `/api/inngest` are exempt, by exact path.
- **AI** ([`packages/ai`](packages/ai/src/index.ts)): a route that calls a model runs `requireUser` → `requireActiveOrg` → `requireAi` → `rateLimit` → handler (`useMeter`, then `c.var.ai.text(...)` or `.object(...)`). AI off is 503 `ai_unavailable` from `requireAi`; an `AiError` (provider error, timeout, answer not matching the schema) reaching `onError` is 502 `ai_failed`. Prompts and answers are never logged. See [add an AI feature](docs/recipes/add-an-ai-feature.md).
- **Route table:** [`route-table.test.ts`](packages/api/tests/route-table.test.ts) lists every public or signature-verified route by exact `METHOD /path`; every other route must answer 401 without a session before touching the database. Adding a public route means adding it there on purpose.
- **Rate limits:** [`rateLimit(bucket, { limit, windowMs })`](packages/api/src/rate-limit.ts) counts per user, or per hashed `cf-connecting-ip` when signed out (never `x-forwarded-for`), in one atomic statement; over the limit is 429 `rate_limited`.
- **Server components read through the API** ([`callApiInProcess`](apps/web/lib/api-server.ts)), never by querying the database directly.
- **Background jobs** are listed in [`packages/api/src/functions.ts`](packages/api/src/functions.ts); events and payloads in [`packages/jobs/src/events.ts`](packages/jobs/src/events.ts). See [add a job](docs/recipes/add-a-job.md) and [add an email](docs/recipes/add-an-email.md).
- **Health:** `/api/health` needs `x-smoke-token`; `pnpm smoke` (local, starts the dev server) and `pnpm smoke:prod` check it.

## Auth and workspaces

- **Only [`packages/auth/src/index.ts`](packages/auth/src/index.ts) (the facade) touches Better Auth.** No Better Auth instance, type or option leaves the package. Read the Better Auth skills in `.claude/skills/` before changing auth.
- **Sessions are read from the database on every request** (cookie cache off). The `/api/auth/*` gate in [`packages/api/src/index.ts`](packages/api/src/index.ts) runs the facade's fresh read first, which deletes sessions that outlived a ban or their impersonating admin; Better Auth's own admin and organization endpoints are closed except impersonate/stop and set-active/list.
- **Guards** ([`guards.ts`](packages/api/src/guards.ts)), in this order on a route: `requireUser` → `forbidWhileImpersonating` (credentials, sessions, membership, billing, deletion) → `requireActiveOrg` → `requireOrgRole("owner", "admin")`. `requireAdmin` re-reads the platform role from the database.
- **Workspace roles** live in [`access.ts`](packages/auth/src/access.ts): `owner` (billing, transfer, delete), `admin` (members, invitations, name, logo), `member`. The database allows exactly one owner per workspace; ownership moves only by transfer (demote, then promote, in one transaction).
- **"Platform admin"** (`user.role = 'admin'`) is a different thing from a workspace admin. Say "platform admin" in code and UI. It is granted only by a direct database update.
- **Tenant isolation:** every workspace-owned table has `organization_id` (NOT NULL, cascade delete, first column of an index); [`schema-ownership.test.ts`](packages/db/tests/schema-ownership.test.ts) fails otherwise. Read and write only through `c.var.orgId` from `requireActiveOrg`; never take a workspace id from the request. An id from another workspace answers 404, the same as an unknown id.
- **Trial:** only a person's first workspace ever is trial-eligible (`user.first_workspace_at`); every later workspace is `noTrial`.
- **Account takeover protection:** password sign-up requires a verified email; proving the email with a code or Google removes an unproven password ([`better-auth.ts`](packages/auth/src/better-auth.ts)).
- **User-facing text says "workspace", never "organization"** ([test](packages/i18n/tests/workspace-copy.test.ts)).

## Billing and entitlements

- **Plans live in code**, in [`packages/billing/src/plans.ts`](packages/billing/src/plans.ts): prices per interval, trial days, `limits`, `meters`, `features`. There is no free plan. `pnpm billing:setup --mode test|live --url <origin>` creates or updates one Dodo product per plan and interval and the webhook, and writes `BILLING_PRODUCT_IDS` and `BILLING_WEBHOOK_SECRET` into the env file.
- **Dodo is known only to [`packages/billing/src/dodo.ts`](packages/billing/src/dodo.ts).** Dodo has no trialing status; `deriveSub` derives it.
- **Only the webhook writes the subscription row** ([`routes/webhooks.ts`](packages/api/src/routes/webhooks.ts)): verify, dedupe by webhook id, reduce, commit; then emit `billing/subscription.changed` and send the lifecycle email. Billing routes ([`routes/billing.ts`](packages/api/src/routes/billing.ts)) only ask the provider.
- **Gating is server-side and atomic** ([`packages/api/src/entitlements.ts`](packages/api/src/entitlements.ts)): `requireLiveSubscription` and `requireFeature` on product routes, `checkCountLimit` inside the write transaction, `useMeter` as one statement. Every refusal is 402 `{ error: "upgrade_required", reason, used?, limit? }`; the client's upgrade dialog handles all of them. UI-only gating is a bug. See [add a plan limit](docs/recipes/add-a-plan-limit.md).
- **React to billing with an Inngest function** on `billing/subscription.changed`, never by editing the webhook route.
- **Locally:** `pnpm billing:simulate <event> --org <workspace-id>` sends signed webhooks (no Dodo keys needed); `pnpm billing:sign <file>` prints signature headers for a body.

## App shell and UI

- **A signed-in page** lives in `apps/web/app/(app)/(shell)/<name>/page.tsx` and renders inside [`AppShell`](apps/web/components/shell/app-shell.tsx) (title, subtitle, optional header `actions`). The sidebar persists in [`(shell)/layout.tsx`](apps/web/app/(app)/(shell)/layout.tsx), which also renders the suspended-workspace state.
- **Navigation** comes only from [`apps/web/config/nav.ts`](apps/web/config/nav.ts): add an item to `NAV` and it shows in the sidebar and the mobile sheet. `roles` and `feature` hide an item from members who lack them; the API still checks.
- **Data** goes through each feature's `services.ts` (the typed `hc` client over `apiFetch`) and `hooks.ts` (TanStack Query). Wrap each data component in [`FeatureBoundary`](apps/web/components/feature-error.tsx) with a skeleton; errors show a generic message with Retry. Other features import a feature only through its `index.ts` (lint rule).
- **The current user and workspace** come from `useMe()` in [`features/auth`](apps/web/features/auth/index.ts), seeded on the server by the `(app)` layout. Use `useIsImpersonating()` to disable controls the API refuses while impersonating.
- **Destructive actions** use [`ConfirmDeleteDialog`](apps/web/components/confirm-delete-dialog.tsx) (typed confirmation).
- **All text** is in [`packages/i18n/src/en.json`](packages/i18n/src/en.json) and read with `t()`; a missing key fails typecheck. Error codes map to `errors.<code>`. Say "workspace", never "organization".
- **Design** comes from `packages/ui` tokens and components only: no hex colors or arbitrary Tailwind values (lint fails). Product identity is in [`apps/web/config/site.ts`](apps/web/config/site.ts).

## Backoffice and audit log

- **Granting platform admin** is a direct database change, never a route or a UI action. Locally:
  ```
  pnpm --filter @workspace/db db:sql "update \"user\" set role = 'admin' where email = 'you@example.com'"
  ```
  In production, run the same `update` against Neon. Set `role = 'user'` to remove it; it takes effect on the next request.
- **The backoffice** is `apps/web/app/(backoffice)/admin` (users, workspaces, subscriptions, audit log), with its own layout and nav ([`features/backoffice`](apps/web/features/backoffice/index.ts)). Its layout asks `/api/admin/check` and shows the 404 page to anyone else. Every route under [`/api/admin`](packages/api/src/routes/admin/index.ts) runs `requireUser` then `requireAdmin` (a fresh role read) and answers 403 `forbidden` otherwise.
- **Admins never act on admins:** no ban, session revoke or impersonation of another platform admin (or oneself). Impersonation is Better Auth's (1 hour, banner on every page); while impersonating, credential, session, membership, billing and deletion routes answer 403 `impersonating` (`forbidWhileImpersonating`, plus the `/api/auth/*` gate for Better Auth's own endpoints).
- **What must be audited** ([`audit.ts`](packages/api/src/audit.ts), the `AuditAction` list): member invited, removed or role changed; ownership transferred; workspace created, deleted, suspended or unsuspended; user banned or unbanned; session revoked by an admin; impersonation started or stopped; plan changed; subscription canceled or resumed. A new security or billing action adds its name there and writes an entry.
- **How:** `writeAudit(tx, auditActor(c), entry)` inside the action's own transaction, so both commit or neither. Facade writes take an `inTx` callback for this (`auth.removeMember(orgId, id, (tx, target) => writeAudit(tx, ...))`); provider calls (plan change, cancel, resume) run inside the transaction after the entry. `auditActor` records the impersonating admin. Metadata never holds secrets: a key that looks like a password, token, code or card number throws.
- **Entries are never edited or deleted** by any route; they go only when their workspace is purged.

## File uploads

- **Private by default.** A file's purpose decides everything about it, in [`packages/api/src/files.ts`](packages/api/src/files.ts): allowed content types, maximum size and visibility. `attachment` is private; `avatar` and `logo` are public. Add a purpose there; the API enforces it and the upload control reads it.
- **Three steps, bytes never touch the Worker** ([`routes/files.ts`](packages/api/src/routes/files.ts), client hook `useUpload` in [`features/files`](apps/web/features/files/index.ts)):
  1. `POST /api/files` declares name, content type, size and purpose: 400 `invalid_file` if the purpose refuses it, else a pending `files` row and a presigned PUT URL (15 minutes, bound to that key and content type).
  2. The browser PUTs the file straight to the bucket (needs the bucket CORS rule in the [README](README.md#file-storage-r2)).
  3. `POST /api/files/:id/complete` checks the stored object: 409 `upload_missing` if absent, 400 `upload_mismatch` (object deleted) if size or type differ, else the file is ready. For an avatar or logo it also sets `user.image` or `organization.logo` and deletes the one it replaced.
- **Reading:** `GET /api/files/:id/download` gives a 5-minute signed URL for a ready private file. Public files are served at `GET /media/:key` from the public folder, raster images only (never SVG or HTML: it is the app's own origin). `DELETE /api/files/:id` removes the object, then the row, and succeeds when the object is already gone.
- **Tenant isolation as everywhere:** every route looks files up by `c.var.orgId`; another workspace's id is 404. Storage keys are random UUIDs.
- **Cleanup:** an hourly job removes pending files older than 24 hours with their objects; the workspace purge deletes every object of the workspace before its rows cascade.

## Marketing site

- **Public pages** live at the top of `apps/web/app` (landing, `pricing`, `blog`, `changelog`, `privacy`, `terms`, `help`, `contact`) and wrap themselves in [`MarketingShell`](apps/web/components/marketing/marketing-shell.tsx) (header, footer, mobile menu, organization and website structured data). Header and footer links come from [`navigation-links.ts`](apps/web/components/marketing/navigation-links.ts).
- **A new public page** goes in [`lib/public-paths.ts`](apps/web/lib/public-paths.ts) (the proxy lets it through without a cookie check, and the sitemap lists it) and gets an `opengraph-image.tsx` using [`ogImage`](apps/web/lib/og.ts) and metadata from [`publicMetadata`](apps/web/lib/public-metadata.ts). [`public-paths.test.tsx`](apps/web/tests/lib/public-paths.test.tsx) fails if a marketing page is not public or reads a session.
- **Marketing pages never read a session.** They render the same for everyone; the header asks `/api/me` from the browser to swap sign-in for an app link.
- **Pricing comes from `plans.ts`**: cards, comparison table and product offers structured data. Only each plan's one-line description is copy (`pricing.planDescription.<plan>` in `en.json`).
- **Blog, changelog and legal pages come from BaseHub** through `getCms()` in [`lib/cms.ts`](apps/web/lib/cms.ts); only `packages/cms` knows BaseHub. Lists render an empty state, an unknown blog slug calls `notFound()`. Setup is in the [README](README.md#marketing-content-basehub). The content model is code in [`packages/cms/scripts/schema.ts`](packages/cms/scripts/schema.ts).
- **Copy** is in `en.json` under `marketing`, `pricing`, `blogPage`, `changelogPage`, `legal`, `helpPage` and `contactPage`; landing copy is placeholder text a product replaces.

## Conventions

- **A module has the same name in four places:** `packages/db/src/schema/<name>.ts`, `packages/api/src/routes/<name>.ts`, `apps/web/features/<name>/` and `apps/web/app/(app)/(shell)/<name>/`. `projects` is the reference; see [add a module](docs/recipes/add-a-module.md).
- **Product code reacts to starter events** (`user.created`, `organization.created`, `organization.deleted`, `billing/subscription.changed`) with Inngest functions; it does not edit starter routes.
- **Tests live in `<package>/tests/`**, mirroring `src/`. Database behavior is tested against real Postgres in `*.pg.test.ts` (`pnpm test:db`), never a fake query builder. Mock only the network edge (`apiFetch`, `fetch`, the provider SDK).
- **Comments say why**, in one line, and never carry ticket or planning ids. A known limit is written as `shortcut: <the limit>, <when to upgrade>`.
- **Recipes** in [`docs/recipes/`](docs/recipes): add a module, a plan limit, an email, a job, an AI feature.

## Pitfalls

Lessons already paid for. Breaking one is a bug.

- **Gating is server-side and atomic:** limits are counted inside the write's transaction (`checkCountLimit`), meters in one statement (`useMeter`). UI-only gating is a bug.
- **Update schemas have no defaults:** `z.object({...}).partial()` keeps a field's `.default()`, so a partial update silently resets it. Write the update schema without defaults.
- **Never trust an id from the request for tenancy:** the workspace comes from `c.var.orgId`; a row id from another workspace must miss (404), not be checked after loading.
- **Audit entries share the action's transaction** (`writeAudit(tx, ...)`). An entry written after commit can be lost; one written outside a rolled-back transaction lies.
- **Webhooks arrive duplicated and out of order:** dedupe by webhook id and reduce with the pure reducer; only the webhook writes the subscription row.
- **Inngest steps are idempotent:** deterministic keys, counters via insert-on-conflict, `Date.now()` and random ids inside `step.run`. Steps return small JSON, never bytes.
- **User-supplied URLs go through `safeFetch`** (`packages/core`): http/https only, public IPs only, every redirect re-checked, size and time capped. No bare `fetch(userUrl)`.
- **Public files are images only:** `/media` serves from the app's own origin, so an SVG or HTML upload there would run script as the app. Never widen a public purpose's types.
- **State-changing `/api` routes check the exact `Origin`;** a new exempt path is added by exact match, never by prefix.

## Commands

- `pnpm dev` starts the app and the Inngest dev server. `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.
- `pnpm bootstrap` brings a fresh clone to a migrated, seeded local database (safe to rerun). `pnpm db:seed` alone re-applies the demo data ([`seed.ts`](tooling/scripts/seed.ts) holds the demo users and their password). Not `pnpm setup` or `pnpm deploy`: those are pnpm built-ins.
- `pnpm test:db` runs the `*.pg.test.ts` suites against a throwaway Postgres container with every migration applied.
- `pnpm db:generate` after a schema change. Until the starter is released, schema changes regenerate the single baseline migration: delete `packages/db/drizzle/` first, then `pnpm db:reset` to rebuild the local database.

## When reality differs from the plan or a spec

Stop and report. Don't guess.
