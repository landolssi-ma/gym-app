import { createGateway, generateText, NoObjectGeneratedError, Output, type LanguageModel } from "ai"
import type { z } from "zod"

import type { Log } from "@workspace/core"

export type AiConfig = { apiKey: string; model: string; log: Log }
// The prompt is data the caller built; instructions are the caller's own words.
export type AiCall = { instructions: string; prompt: string; model?: string }
export type AiUsage = { model: string; tokensIn: number; tokensOut: number }

// Fixed, like safeFetch's limits: a stuck provider must fail the call, not hold the request.
export const AI_TIMEOUT_MS = 60_000

// No `cause` and no provider message: the log serializer and stack traces would otherwise carry
// the prompt, the answer or the provider's response body.
export class AiError extends Error {
  constructor(readonly kind: "provider" | "timeout" | "invalid_output", readonly status?: number) {
    super(`ai call failed: ${kind}`)
    this.name = "AiError"
  }
}

function toAiError(err: unknown): AiError {
  if (err instanceof Error && err.name === "TimeoutError") return new AiError("timeout")
  if (NoObjectGeneratedError.isInstance(err)) return new AiError("invalid_output")
  const status = (err as { statusCode?: unknown } | null)?.statusCode
  return new AiError("provider", typeof status === "number" ? status : undefined)
}

// Vercel AI Gateway: one key, any "provider/model" id. `provider` is replaceable for tests only.
export function createAi(c: AiConfig, provider: (model: string) => LanguageModel = createGateway({ apiKey: c.apiKey })) {
  async function run<O extends Parameters<typeof generateText>[0]["output"]>(call: AiCall, output?: O) {
    const model = call.model ?? c.model
    const started = Date.now()
    try {
      // One model request per call: the caller (a retry click, an Inngest step) owns retries, so one
      // metered call never costs three requests.
      const r = await generateText({ model: provider(model), instructions: call.instructions, prompt: call.prompt, output, maxRetries: 0, timeout: AI_TIMEOUT_MS })
      const usage = { model, tokensIn: r.usage.inputTokens ?? 0, tokensOut: r.usage.outputTokens ?? 0 }
      // Counts only: prompts and answers hold account data.
      c.log.info("ai_call", { ...usage, ms: Date.now() - started })
      return { r, usage }
    } catch (err) {
      const e = toAiError(err)
      c.log.error("ai_failed", { model, kind: e.kind, status: e.status, ms: Date.now() - started })
      throw e
    }
  }
  return {
    async text(call: AiCall): Promise<AiUsage & { text: string }> {
      const { r, usage } = await run(call)
      return { text: r.text, ...usage }
    },
    // The answer is parsed against `schema`; a mismatch fails the call, never returns unchecked data.
    async object<S extends z.ZodType>(call: AiCall & { schema: S }): Promise<AiUsage & { data: z.output<S> }> {
      const { r, usage } = await run(call, Output.object({ schema: call.schema }))
      return { data: r.output as z.output<S>, ...usage }
    },
  }
}
export type Ai = ReturnType<typeof createAi>
