# Design

## Context

See proposal.md (Why) and specs/ai-generation for the behavior. Constraints this design works within:

- Workers rules: nothing that does I/O is built at module level; each package gets a typed config through `createX(config)` and never reads env; `wrangler.jsonc` holds exactly one binding (`HYPERDRIVE`), so Workers AI (a binding) is out.
- Optional integrations are parsed in `packages/api/src/bootstrap.ts` into one object or `undefined` (`google`, `posthog`), and an absent one is an optional field on `Deps` (`analytics?`).
- `createLog` serializes an `Error` with its `cause` chain, so anything thrown with a provider error as `cause` would put the provider's response in the logs.
- `onError` in `packages/api/src/index.ts` turns every unhandled error into 500 `internal`.
- AI SDK v7 (`ai`, latest 7.0.173) exports `createGateway`, `generateText` with `instructions`, `output: Output.object({ schema })`, `timeout` and `maxRetries`, and `MockLanguageModelV4` from `ai/test`.

## Goals / Non-Goals

**Goals:**
- One small package that is the only importer of `ai`, with an interface a product uses without reading AI SDK docs.
- Tests that need no key and no network.

**Non-Goals:**
- No AI route, screen, meter or prompt in the starter itself.
- No provider-specific workarounds (for example schema tweaks for one provider's structured-output limits) until a product hits one.
- No message history or image input: `prompt` is a string in v1.

## Decisions

### 1. Interface: two methods, Zod schemas in, plain results out

```ts
const ai = createAi({ apiKey, model, log })
const { text, model, tokensIn, tokensOut } = await ai.text({ instructions, prompt, model? })
const { data, model, tokensIn, tokensOut } = await ai.object({ schema, instructions, prompt, model? })
```

No AI SDK type appears in the arguments or results, so a product never imports `ai`, and an SDK major upgrade stays inside one package. Zod is already the schema language everywhere in the starter. Alternative considered: re-exporting `generateText` with a preconfigured model. It's smaller, but every route then depends on the SDK's API and its breaking changes.

### 2. Vercel AI Gateway, created per call to `createAi`

`createGateway({ apiKey })` is built inside `createAi`, which `createDeps` calls per request (`ai: c.ai && createAi({ ...c.ai, log })`). The model id goes to the gateway unchanged, so any `provider/model` it supports works with no new dependency. A test seam, `createAi(config, provider = createGateway({ apiKey }))`, lets tests pass a function returning `MockLanguageModelV4`.

### 3. Config: two optional keys, folded into `ai`

`AI_GATEWAY_API_KEY: optional(secret)` and `AI_MODEL: optional(z.string().regex(/^[^/\s]+\/\S+$/))`, transformed like `google` into `ai: { apiKey, model } | undefined`. A blank or malformed value turns AI off rather than failing startup, which is the existing rule for optional integrations. `getPublicConfig()` adds `aiEnabled: !!c.ai`. In `check-client-secrets.ts`, `AI_MODEL` gets a fixed `provider/model` value: it isn't secret and the generated sentinel would fail the regex. The key gets the usual sentinel, so the check runs with AI on.

### 4. One model request per call: `maxRetries: 0`, a fixed time limit

The SDK retries twice by default. That would make one metered call cost up to three model requests, and inside an Inngest step it would stack with Inngest's own retries. Retrying is left to the caller: the user clicks again after a 502, or the job's step retries. Each call passes `timeout: AI_TIMEOUT_MS` (60 s, a constant in the package, like `safeFetch`'s limits). A feature that needs longer changes the constant.

### 5. Errors: `AiError` with a kind and no cause

The package catches every SDK failure and throws `new AiError(kind, status?)`, where `kind` is one of `"provider" | "timeout" | "invalid_output"`. Its message is just `ai call failed: <kind>`, and it carries no `cause`, so neither the log serializer nor a stack trace can expose the prompt, answer or provider body. `onError` maps `AiError` to 502 `ai_failed` before the 500 fallback, so routes need no try/catch. In a job, the same error fails the step and Inngest retries it.

### 6. Logging inside the package

On success: `log.info("ai_call", { model, tokensIn, tokensOut, ms })`. On failure: `log.error("ai_failed", { model, kind, status, ms })`. The logger comes in through config (`log` from `createDeps`), as with `createMail`. `onError` doesn't log `AiError` again, since the package already did.

### 7. `requireAi` guard, which also gives routes a typed `ai`

The guard lives in `guards.ts`: `if (!c.var.deps.ai) return c.json({ error: "ai_unavailable" }, 503)`, then `c.set("ai", c.var.deps.ai)`. `GuardEnv` gains `ai: Ai`, so a handler uses `c.var.ai.object(...)` without a non-null assertion. Route order: `requireUser` → `requireActiveOrg` → `requireAi` → `rateLimit(...)` → handler (`useMeter`, then the call). That gives the spec's "503 before any meter is counted".

### 8. Metering stays the product's, through the existing `useMeter`

The starter adds no meter, since `plans.ts` has `meters: {}`. The recipe shows a product adding `ai_calls` (or a per-feature name) and calling `useMeter` before the model call, so a refused request never reaches the model.

### 9. Prompts live in product code, with a data boundary

The recipe puts a feature's instructions and schema next to its route (`packages/api/src/routes/<module>-ai.ts`). User or workspace content goes inside a delimited block, and the instructions say it is data, not instructions. That keeps prompt-injection handling where the content is known.

## Risks / Trade-offs

- [A metered call that then fails still uses one unit] → `shortcut: failed AI calls are counted, refund the unit (decrement in the same period) when a product's failure rate makes it visible`. Documented in the recipe.
- [Token counts are reported but not limited; a long prompt costs more than a short one under a per-call meter] → Products log `tokensIn`/`tokensOut`; token budgets are a later change.
- [`ai` adds bundle size to the single Worker] → The build task records the Worker bundle size before and after and confirms it stays within the Workers limit.
- [A provider rejects a schema feature (some refuse array size limits in structured output)] → It surfaces as `ai_failed` with `invalid_output` or `provider` in the log. The fix goes in the package when a product meets it, not up front.
- [60 s limit vs. a long job] → The constant is one line, and long work belongs in an Inngest step, which has its own time budget.
- [Vercel is one more vendor in the path] → Accepted for one key and any model; switching to a direct provider package changes only `packages/ai`.

## Migration Plan

Additive. A deploy without the two keys runs exactly as today. To turn AI on: set `AI_GATEWAY_API_KEY` and `AI_MODEL` in `apps/web/.env` or Worker secrets (`pnpm secrets:deploy`). Rollback: remove the keys.
