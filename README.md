# SaaS starter kit

A starter for SaaS products on Cloudflare: auth, workspaces, billing, emails, app shell, marketing site and admin. See [AGENTS.md](AGENTS.md) for the stack and conventions.

## Quickstart

Needs Node 22.12+, pnpm 11 and Docker.

```
pnpm install
pnpm bootstrap
pnpm dev
```

`pnpm bootstrap` creates `apps/web/.env` from `.env.example` (with a fresh `BETTER_AUTH_SECRET`), starts Postgres in Docker on port 5433, applies the migrations and seeds demo data. It is safe to run again. `pnpm dev` serves the app at `APP_ORIGIN` (http://localhost:5173 by default) and the Inngest dev server at http://localhost:8288. If port 5173 is taken, change `APP_ORIGIN` in `apps/web/.env` (for example to http://localhost:5174): the dev server follows it.

Sign in at `/sign-in` as one of the seeded people: `owner@example.com` (owner of a trialing and a paid workspace), `member@example.com` or `admin@example.com` (platform admin, `/admin`). The password is in [`tooling/scripts/seed.ts`](tooling/scripts/seed.ts), or use the email code: in development emails are not sent but logged to the `pnpm dev` output, code and links included.

To try the funnel as a new customer, sign up with any email, answer the survey and pick a plan. Without Dodo keys the checkout cannot open; simulate the provider's webhook instead:

```
pnpm billing:simulate subscription.active --org <workspace-id>
```

The workspace id is in the URL of `/admin/organizations` (sign in as the admin) or in the `pnpm dev` log. Then `pnpm test`, `pnpm test:db`, `pnpm lint` and `pnpm typecheck` run the checks.

What runs locally without any account: auth (email code and password), workspaces, billing through `billing:simulate`, emails (logged), the marketing pages that need no CMS. What needs your own keys: Google sign-in, real checkout (Dodo test keys, then `pnpm billing:setup --mode test --url <origin>`), file uploads (an R2 bucket, below), the blog, changelog and legal pages (BaseHub, below) analytics (PostHog) and AI (a Vercel AI Gateway key). Every key is listed and explained in [`apps/web/.env.example`](apps/web/.env.example).

## Marketing content (BaseHub)

The blog, changelog and legal pages (privacy, terms) come from a [BaseHub](https://basehub.com) repository. The landing, pricing, help and contact pages need nothing from it. Until a collection has entries, its page shows an empty state.

1. Create a BaseHub account and an empty repository.
2. In the repository's **Connect** panel, create a Read token and an Admin token. Put them in `apps/web/.env`:
   ```
   CMS_API_KEY=<read token>
   CMS_ADMIN_API_KEY=<admin token>
   ```
   Keep `CMS_PROVIDER=basehub` and `CMS_API_URL=https://api.basehub.com/graphql`.
3. Create the collections (Articles, Legal Documents, Changelog Entries). It is safe to run again:
   ```
   pnpm --filter @workspace/cms cms:setup
   ```
4. Run `pnpm dev` and open `/blog`, `/changelog`, `/privacy` and `/terms`: each renders with its empty state.
5. Add content in BaseHub and commit it; only committed content is shown. A privacy policy or terms page is a Legal Documents entry with `kind` set to `privacy` or `terms`. The site picks up changes within an hour (legal pages within a day).

For production, put `CMS_PROVIDER`, `CMS_API_URL` and `CMS_API_KEY` in `.env.production` before `pnpm secrets:deploy`. The admin token is for `cms:setup` only and never needs to be deployed.

## File storage (R2)

Uploads go from the browser straight to the bucket through short-lived signed URLs, so the bucket must allow cross-origin `PUT` from the app. In the Cloudflare dashboard, open **R2 → your bucket → Settings → CORS policy** and add:

```json
[
  {
    "AllowedOrigins": ["https://your-app.example"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

Use your `APP_ORIGIN` (add your local `APP_ORIGIN` too if local dev uses this bucket). Keep the bucket private: private files are read through signed links, and avatars and logos through the app's `/media` route. `pnpm smoke:prod` checks the rule and fails without it.
