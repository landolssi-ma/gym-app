# SaaS starter kit

A starter for single-account SaaS products on Cloudflare: authentication, account-owned data, email, an app shell, a marketing site and platform administration. See [AGENTS.md](AGENTS.md) for the stack and conventions.

## Quickstart

Needs Node 22.12+, pnpm 11 and Docker.

```
pnpm install
pnpm bootstrap
pnpm dev
```

`pnpm bootstrap` creates `apps/web/.env` from `.env.example` (with a fresh `BETTER_AUTH_SECRET`), starts Postgres in Docker on port 5433, applies the migrations and seeds demo data. It is safe to run again. `pnpm dev` serves the app at `APP_ORIGIN` (http://localhost:5173 by default) and the Inngest dev server at http://localhost:8288. If port 5173 is taken, change `APP_ORIGIN` in `apps/web/.env` (for example to http://localhost:5174): the dev server follows it.

Local emails are sent to MailCatcher: open http://localhost:1080. SMTP listens on port `1025` and the HTTP-to-SMTP relay on port `8025`.

Sign in at `/sign-in` as `owner@example.com`, `member@example.com` or `admin@example.com` (platform admin, `/admin`). The password is in [`tooling/scripts/seed.ts`](tooling/scripts/seed.ts), or use the email code: in development emails are not sent but logged to the `pnpm dev` output, code and links included. Successful sign-in opens the dashboard directly.

Run `pnpm test`, `pnpm test:db`, `pnpm lint` and `pnpm typecheck` to check the project.

What runs locally without any account: authentication (email code and password), account-owned projects, emails (logged), and marketing pages that need no CMS. What needs your own keys: Google sign-in, file uploads (an R2 bucket, below), the blog, changelog and legal pages (BaseHub, below), analytics (PostHog) and AI (a Vercel AI Gateway key). Every key is listed and explained in [`apps/web/.env.example`](apps/web/.env.example).

When migrating a legacy deployment, follow the [data export instructions](docs/migrations/remove-workspaces.md) before applying the schema migration.

## Marketing content (BaseHub)

The blog, changelog and legal pages (privacy, terms) come from a [BaseHub](https://basehub.com) repository. The landing, help and contact pages need nothing from it. Until a collection has entries, its page shows an empty state.

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

Use your `APP_ORIGIN` (add your local `APP_ORIGIN` too if local dev uses this bucket). Keep the bucket private: private files are read through signed links, and avatars through the app's `/media` route. `pnpm smoke:prod` checks the rule and fails without it.
