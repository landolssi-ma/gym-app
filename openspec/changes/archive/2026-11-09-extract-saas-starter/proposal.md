# Proposal

## Why

Every new SaaS rebuilds the same 80%: auth, workspaces, billing, emails, app shell, marketing site, admin. `~/Projects/presell-page-builder` (Umiplex) already has a production-tested version of most of it, but tangled with product code (AI page generation, editor, crawler, Shopify). Extracting it into a starter lets each new product start at the 20% that is actually the product, on the same Cloudflare stack.

## What Changes

- New fresh git repository `saas-starter-kit`: a pnpm + Turborepo monorepo with one app (`apps/web`) and infrastructure packages, ported from presell-page-builder at commit `43cb8fe` (port the code, don't rebuild it).
- Same runtime as the source: vinext (Next 16 App Router on Vite) on one Cloudflare Worker, Neon Postgres through Hyperdrive, R2 over the S3 API.
- Same design, cloned exactly: marketing site, onboarding funnel, app shell, shared pages (sign-in, team, billing, settings), design tokens and shadcn components.
- Auth and workspaces: email code, Google, email + password with breached-password check, required email verification for password sign-up, password reset, sessions, personal workspace on sign-up, more workspaces on demand, roles owner/admin/member, invitations, ownership transfer, workspace and account deletion.
- Billing with Dodo, paid plans only: trial, then paid. Plans, limits and features defined in one `plans.ts` file and synced to Dodo. Checkout, customer portal, monthly and yearly prices, plan change, cancel and resume, verified and deduplicated webhooks, lifecycle emails, trial reminders.
- Entitlements: server-side feature gates, count limits (for example seats) and usage meters, checked atomically with the write; an over-limit request returns "upgrade required".
- Onboarding funnel: landing CTA, sign-up, survey, plans with trial checkout, activation wait, dashboard.
- Marketing site: landing, pricing generated from `plans.ts`, legal pages, blog and changelog from the BaseHub CMS, SEO (metadata, OG images, sitemap, structured data).
- File uploads: presigned uploads to R2, a files table scoped to the workspace, avatars and workspace logos.
- Admin backoffice: users (ban, sessions, impersonation), workspaces (suspend), subscriptions, audit log viewer.
- Audit log of security and billing actions.
- Reference module `projects`: a minimal workspace-scoped resource that shows every convention end to end, meant to be copied for product features and then deleted.
- Developer experience: one-command setup, local Postgres, dev seed data, billing webhook simulator, CI (lint, typecheck, tests), `AGENTS.md`, recipes.
- Removed from the source (product-specific): `ai`, `blocks`, `crawler`, `shopify` packages, the pages/editor/builder/brand/sample/claim features and routes, product marketing pages, the two-origin hosting of customer pages, the quality harness.

## Capabilities

### New Capabilities

- `platform-config`: typed, validated configuration from env; optional integrations turn themselves off when their env is absent.
- `api-foundation`: API conventions shared by every route: error format, origin check, cookie checks, rate limiting, health check.
- `user-auth`: sign-up and sign-in methods, email verification, password reset, sessions, bans, account deletion.
- `organizations`: workspaces, members, roles, invitations, switching, tenant isolation, workspace deletion.
- `billing`: plans, trial, checkout, customer portal, plan changes, cancellation, webhooks, billing lifecycle emails.
- `entitlements`: feature gates, count limits and usage meters enforced on the server.
- `transactional-email`: email templates, shared layout, delivery in production and development.
- `file-uploads`: presigned uploads and downloads, file records, avatars and workspace logos.
- `app-shell`: signed-in layout, navigation, settings pages, suspended and impersonation states.
- `onboarding-funnel`: the path from sign-up through survey and trial checkout to the dashboard.
- `marketing-site`: public pages, pricing, legal, blog and changelog, SEO.
- `admin-backoffice`: platform admin tools for users, workspaces and subscriptions.
- `audit-log`: recording and viewing security and billing actions.

### Modified Capabilities

None (new project, no existing specs).

## Impact

- New repository; nothing existing is modified. presell-page-builder is read-only input.
- External services: Cloudflare (Workers, Hyperdrive, R2), Neon, Dodo Payments, Resend, Inngest, BaseHub, Google OAuth; PostHog optional.
- Every product built from the starter inherits these conventions; changing them later means changing every product.
