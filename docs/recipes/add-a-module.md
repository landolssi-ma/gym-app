# Add a module

A module is one account-owned resource with its table, routes, client code and page. `projects`
is the reference: copy it, rename it, and delete `projects` once the product has its own modules.

A module uses the **same name in four places**. For a module `notes`:

| Where | What |
|---|---|
| `packages/db/src/schema/notes.ts` | the table |
| `packages/api/src/routes/notes.ts` | the routes |
| `apps/web/features/notes/` | services, hooks, components, `index.ts` |
| `apps/web/app/(app)/(shell)/notes/page.tsx` | the page |

## 1. Table

Copy [`schema/projects.ts`](../../packages/db/src/schema/projects.ts) to `schema/notes.ts` and export it from `schema/index.ts`.
Keep `user_id`: NOT NULL, reference `user.id` with `onDelete: "cascade"`, and index it.

Then regenerate the migration. Until the starter is released there is one baseline:

```
rm -rf packages/db/drizzle && pnpm db:generate && pnpm db:reset
```

After release, `pnpm db:generate` adds a new migration instead.

## 2. Routes

Copy [`routes/projects.ts`](../../packages/api/src/routes/projects.ts) to `routes/notes.ts` and mount it in
[`packages/api/src/index.ts`](../../packages/api/src/index.ts): `.route("/api/notes", notesRoutes)`. Keep:

- **Guards:** `requireUser` on the router. The authenticated `userId` is the record owner.
- **Validation:** `json(schema)` on every body. A create schema may have defaults; an update schema
  must not (`z.object({...}).partial()` without `.default()`), or a partial update resets fields.
- **Account ownership:** every query filters by `c.var.userId`. An id owned by another account
  matches nothing and answers 404, like an unknown id. Never read an owner id from the request.

The [route table test](../../packages/api/tests/route-table.test.ts) checks that every new route answers
401 without a session before touching the database; a public route must be added there on purpose.

Test the routes against Postgres in `packages/api/tests/notes.pg.test.ts`, copied from
[`projects.pg.test.ts`](../../packages/api/tests/projects.pg.test.ts): CRUD, 400 on invalid input and
404 for another account's id. Run them with `pnpm test:db`.

## 3. Client

Copy [`apps/web/features/projects/`](../../apps/web/features/projects/index.ts) to `features/notes/`:

- `services.ts` calls the typed client: `api.api.notes.$get()`. Use the module's own route types; a
  typo fails typecheck.
- `hooks.ts` wraps them in TanStack Query (`useSuspenseQuery`, mutations that invalidate the
  module's keys).
- `components/` holds the view. Do not handle 401 yourself: `apiFetch` sends the user to sign-in.
- `index.ts` is the only file other features and pages import (lint enforces it).

## 4. Page and navigation

Copy [`(shell)/projects/page.tsx`](../../apps/web/app/(app)/(shell)/projects/page.tsx): `AppShell` with a title, and the view inside
`FeatureBoundary` with a skeleton. Add a nav item to `NAV` in
[`config/nav.ts`](../../apps/web/config/nav.ts). Put every string in [`en.json`](../../packages/i18n/src/en.json) under the module's name, and
the nav label under `nav`.

Test the view in `apps/web/tests/features/notes/`, copied from
[`projects-view.test.tsx`](../../apps/web/tests/features/projects/projects-view.test.tsx).

## 5. Check

```
pnpm typecheck && pnpm lint && pnpm test && pnpm test:db
```

## Removing `projects`

Delete `packages/db/src/schema/projects.ts` (and its export), `packages/api/src/routes/projects.ts` (and
its mount), `apps/web/features/projects/`, `apps/web/app/(app)/(shell)/projects/`, the nav item,
the `projects` strings, the tests under `packages/api/tests/projects.pg.test.ts` and
`apps/web/tests/features/projects/`, and the sample projects in `tooling/scripts/seed.ts`. Then
regenerate the migration.
