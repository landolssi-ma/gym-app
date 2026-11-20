# Add a background job

Jobs run on Inngest. Use one when work should not block a request (sending many emails, cleaning up
storage) or when product code should react to a starter event (`user.created`,
`organization.created`, `organization.deleted`, `billing/subscription.changed`) without editing
starter routes.

## 1. Add an event (only if you send a new one)

Events and their payloads live in `packages/jobs/src/events.ts`. Sending a name that is not listed
there, or the wrong payload, fails `pnpm typecheck`.

```ts
export type Events = {
  // ...
  "projects/exported": { organizationId: string; fileId: string }
}
```

Send it from a route after the write is committed. The third argument is a dedupe id: the same id
sent twice within 24 hours runs functions once.

```ts
await c.var.deps.jobs.send("projects/exported", { organizationId, fileId }, `projects/exported:${fileId}`)
```

## 2. Define the function

One module per job in `packages/api/src/jobs/`, named after what it does:

```ts
// packages/api/src/jobs/welcome-checklist.ts
import type { Deps } from "../index"

export function welcomeChecklistFunction(deps: Deps) {
  return deps.jobs.define(
    { id: "welcome-checklist", triggers: [{ event: "user.created" }], retries: 2 },
    async ({ event, step }) => {
      const { userId } = event.data as { userId: string }
      await step.run("create-checklist", () => deps.db.insert(/* ... */))
    },
  )
}
```

Rules that keep retries safe:

- Every side effect goes in a `step.run`; a step that succeeded is not run again on retry.
- Steps are idempotent: deterministic storage keys, counters via insert-on-conflict, never a bare increment.
- `Date.now()`, `crypto.randomUUID()` and DB reads go inside `step.run`.
- Steps return ids and small JSON, never file bytes.
- For a schedule, use `triggers: [{ cron: "0 9 * * *" }]` instead of an event.

## 3. Register it

Add it to the list in `packages/api/src/functions.ts`:

```ts
export function jobFunctions(deps: Deps): InngestFunction.Any[] {
  return [welcomeChecklistFunction(deps)]
}
```

## 4. Test it

Put the test in `packages/api/tests/jobs/<name>.test.ts`. Build the function with a real
`createJobs` client, then call its handler directly with a fake event and a `step` whose `run`
just runs the callback:

```ts
const jobs = createJobs({ appId: "test", eventKey: "k", signingKey: "s", isDev: true })
const fn = welcomeChecklistFunction(fakeDeps({ jobs }))
const step = { run: async (_name: string, cb: () => unknown) => cb() }
const result = await fn["fn"]({ event: { data: { userId: "u1" } }, step } as never)
```

Use a `*.pg.test.ts` file (run with `pnpm test:db`) when the job writes to the database.

## 5. Check it locally

`pnpm dev` starts the app and the Inngest dev server (http://localhost:8288). The dev server lists
the app's functions under **Functions**; send a test event from its UI to run one.
