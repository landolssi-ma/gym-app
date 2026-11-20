# Proposal

## Why

Future products built from the starter will have AI features, and each would otherwise wire the AI SDK, provider keys, timeouts, error handling and usage tracking from scratch, and get the Workers rules wrong in a new way each time. One small package that wraps the Vercel AI SDK, built the starter's way (per-request factory, validated config, optional integration), gives every fork the same tested foundation. The starter itself ships no AI feature.

## What Changes

- New package `packages/ai` (`@workspace/ai`) wraps the Vercel AI SDK (`ai`). It is the only package that imports `ai`; product code imports `@workspace/ai`.
- `createAi(config)` is built per request in `createDeps`. Its methods:
  - `text`: returns a plain-text answer.
  - `object`: returns structured data checked against a Zod schema the caller passes.
  - Both return the whole answer at once (no streaming). Each result also carries the model used and its token counts (`tokensIn`, `tokensOut`).
- Models are reached through the Vercel AI Gateway with one key. The model is a plain `provider/model` string from config (`AI_MODEL`), and a single call may pass its own.
- AI is an optional integration, like Google sign-in and PostHog. With `AI_GATEWAY_API_KEY` or `AI_MODEL` blank or malformed, `deps.ai` is `undefined` and everything else works.
- A route guard `requireAi` answers `503 { "error": "ai_unavailable" }` when AI is off. A provider failure or timeout answers `502 { "error": "ai_failed" }`. Both codes get messages in `en.json`.
- Every call has a time limit. Logs record the model, token counts, duration and failure status, never prompts or answers.
- The browser learns whether AI is on through `getPublicConfig()` (`aiEnabled`), so a product can hide AI controls when it is off.
- A recipe, `docs/recipes/add-an-ai-feature.md`, covers writing the prompt in the product's own code, the route (guards, `requireAi`, rate limit, a plan meter through the existing `useMeter`), and the background-job variant for long tasks.
- Out of scope, each a separate change once a product needs it: streaming, images, embeddings, tool calling, token-based plan limits.

## Capabilities

### New Capabilities

- `ai-generation`: text and structured-data generation through a configured model, with time limits, token counts, uniform errors and private logs.

### Modified Capabilities

- `platform-config`: AI generation joins the optional integrations that turn off when not configured, and the AI gateway key joins the secrets that must never reach the browser.

## Impact

- New `packages/ai` with a pinned `ai` dependency, plus its tests.
- `packages/api`: `bootstrap.ts` (two env keys, `ai` in `Deps`), a `requireAi` guard, the `ai_failed` error mapping, tests.
- `apps/web`: `.env.example`, `getPublicConfig()` (`aiEnabled`).
- `packages/i18n`: `errors.ai_unavailable` and `errors.ai_failed`.
- `tooling/scripts/check-client-secrets.ts`: a fixed value for the non-secret `AI_MODEL`.
- Docs: the new recipe, and the `AGENTS.md` package map and stack list.
- External service: Vercel AI Gateway, optional. No new Cloudflare binding, and no database or plan changes.
