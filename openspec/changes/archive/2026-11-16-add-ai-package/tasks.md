# Tasks

## 1. Package scaffold

- [x] 1.1 Build `apps/web` on this branch before any change (`pnpm --filter web build`) and record the Worker bundle size (raw and gzip) as a note under this task; verify the build succeeds
  - Before: `wrangler deploy --dry-run -c dist/server/wrangler.json` reports Total Upload 6261.99 KiB / gzip 1991.31 KiB.
- [x] 1.2 Create `packages/ai` (`@workspace/ai`) shaped like `packages/mail`: `package.json` with `ai` pinned to the newest exact 7.x version that the workspace's minimum release age accepts, `zod: catalog:`, the shared eslint and typescript configs, `src/index.ts`; verify that `pnpm install` succeeds and `pnpm --filter @workspace/ai typecheck` passes

## 2. The ai package

- [x] 2.1 Implement `createAi({ apiKey, model, log }, provider = createGateway({ apiKey }))` with `text({ instructions, prompt, model? })` and `object({ schema, instructions, prompt, model? })` over `generateText` (`Output.object` for `object`), each passing `maxRetries: 0` and `timeout: AI_TIMEOUT_MS` (60 s) and returning `{ text | data, model, tokensIn, tokensOut }` with no AI SDK type in the signatures. Add `packages/ai/tests/index.test.ts` using `MockLanguageModelV4`, covering: text answer with token counts, typed object answer, a per-call model used for that call only, and `maxRetries: 0` / the timeout reaching the SDK call; verify that the tests pass
- [x] 2.2 Add `AiError(kind: "provider" | "timeout" | "invalid_output", status?)` with message `ai call failed: <kind>` and no `cause`; map every SDK failure to it; log `ai_call` (model, tokensIn, tokensOut, ms) on success and `ai_failed` (model, kind, status, ms) on failure. Test: a schema mismatch throws `invalid_output`, a provider error throws `provider` with its status, an abort throws `timeout`, and no serialized log line or `AiError` (through `createLog`'s serializer) contains the prompt, instructions, answer or key; verify that the tests pass
- [x] 2.3 Add the `ai` row to the `AGENTS.md` package map and an "AI: Vercel AI SDK through the Vercel AI Gateway (optional)" line to its technology stack; verify both read correctly next to the existing rows

## 3. Wiring: config, guard, errors, browser

- [x] 3.1 In `packages/api/src/bootstrap.ts`, add `AI_GATEWAY_API_KEY: optional(secret)` and `AI_MODEL: optional(z.string().regex(/^[^/\s]+\/\S+$/))`, fold them into `ai: { apiKey, model } | undefined`, add `ai?: Ai` to `Deps` and build it in `createDeps` with the request's `log`. Add an "AI (Vercel AI Gateway, optional)" section to `apps/web/.env.example` saying what turns off when either is empty. Extend `bootstrap.test.ts`: AI is off in the base valid env, on only when both keys are set and the model is `provider/model`, and the raw keys never reach the parsed config; verify that `bootstrap.test.ts` and `env-example.test.ts` pass
- [x] 3.2 Add the `requireAi` guard to `guards.ts` (503 `ai_unavailable` when `deps.ai` is unset, else `c.set("ai", …)`, with `ai: Ai` on `GuardEnv`); map `AiError` to 502 `{ "error": "ai_failed" }` in `onError` before the 500 fallback, without logging it again; add `errors.ai_unavailable` and `errors.ai_failed` to `en.json`. Test with a throwaway Hono app in the test file: AI off answers 503 and never touches `db` (the `forbidden` proxy) or the meter; a handler throwing `AiError` answers 502 with exactly `{ "error": "ai_failed" }`; verify that the tests pass and `pnpm typecheck` passes
- [x] 3.3 Add `aiEnabled: !!c.ai` to `getPublicConfig()`, and give `AI_MODEL` a fixed `provider/model` value in `tooling/scripts/check-client-secrets.ts` (it isn't secret, and the generated sentinel would fail its regex). Extend `apps/web/tests/lib/config.test.ts` so `aiEnabled` follows the config and the public config holds neither the key nor the model; verify that the test passes and that `pnpm check:secrets` passes with AI on
- [x] 3.4 Update `AGENTS.md`: Configuration (AI is an optional integration like Google and PostHog), API conventions (`requireAi` and where it sits in the guard order, `ai_unavailable` and `ai_failed`). Add AI to the README's "What needs your own keys" list; verify that each statement matches the code from 3.1 to 3.3

## 4. Recipe

- [x] 4.1 Write `docs/recipes/add-an-ai-feature.md`: add a meter to `plans.ts`; put the prompt and Zod schema next to the route in the product's own file, with user content inside a delimited data block the instructions call data; route order `requireUser` → `requireActiveOrg` → `requireAi` → `rateLimit` → handler (`useMeter`, then `c.var.ai.object(...)`); the Inngest variant for long tasks (check `deps.ai`, let the step retry on `AiError`); hide AI controls when `aiEnabled` is false; test with `MockLanguageModelV4`; the `shortcut:` that a failed call still uses its meter unit. Add it to the recipes list in `AGENTS.md`. Verify by following the recipe to add a throwaway AI route and test on `projects` (meter refused → no model call, AI off → 503, success → typed data) whose tests pass, then delete it
  - Verified on `projects` (meter, route and pg test from the recipe): success 200 with typed data, over the meter 402 with the model not called, AI off 503; all 200 DB tests passed with it, then it was deleted. Tests use `createTestAi` from `@workspace/ai/testing`, so `packages/api` never imports `ai`.

## 5. Integration check

- [x] 5.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:db`, `pnpm build` and `pnpm check:secrets`; verify that all pass and that the Worker bundle size, compared with the note in 1.1, stays within the Workers size limit (record both numbers under this task)
  - All six pass (555 unit, 198 DB tests; `check:secrets` covers 16 secrets with AI on). After: Total Upload 6514.78 KiB / gzip 2057.43 KiB, +252.79 KiB / +66.12 KiB gzip over 1.1, within the Workers Free (3 MiB) and Paid (10 MiB) compressed limits.
- [x] 5.2 With `AI_GATEWAY_API_KEY` and `AI_MODEL` empty in `apps/web/.env`, run `pnpm smoke`; verify that the app starts and the health check passes with AI off

## Workflow follow-up

- Archive on `change/add-ai-package` and commit the synced specs and moved change folder as `add-ai-package: archive and sync specs`.
- Merge or push only when the user asks.
