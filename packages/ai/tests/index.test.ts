import { APICallError } from "ai"
import { MockLanguageModelV4 } from "ai/test"
import { afterEach, describe, expect, test, vi } from "vitest"
import { z } from "zod"

import { createLog } from "@workspace/core"

import { AiError, createAi } from "../src/index"
import { createTestAi } from "../src/testing"

const usage = { inputTokens: { total: 12, noCache: 12, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } }
const answer = (text: string) => ({ content: [{ type: "text" as const, text }], finishReason: { unified: "stop" as const, raw: undefined }, usage, warnings: [] })
const noop = () => {}
const config = { apiKey: "test-key", model: "anthropic/claude-sonnet-5", log: { info: noop, warn: noop, error: noop } }

afterEach(() => vi.restoreAllMocks())

// Each model id gets its own mock, so a test can see which model a call reached.
function provider(text: string) {
  const models = new Map<string, MockLanguageModelV4>()
  const get = (id: string) => models.get(id) ?? models.set(id, new MockLanguageModelV4({ modelId: id, doGenerate: answer(text) })).get(id)!
  return { get, models }
}
const call = { instructions: "Summarize.", prompt: "The quarterly notes." }

describe("createAi", () => {
  test("text returns the answer, the configured model and its token counts", async () => {
    const p = provider("Three bullets.")
    expect(await createAi(config, p.get).text(call)).toEqual({ text: "Three bullets.", model: "anthropic/claude-sonnet-5", tokensIn: 12, tokensOut: 5 })
  })

  test("object returns data typed and checked by the schema", async () => {
    const p = provider(JSON.stringify({ title: "Q3", tags: ["sales", "plan"] }))
    const r = await createAi(config, p.get).object({ ...call, schema: z.object({ title: z.string(), tags: z.array(z.string()) }) })
    expect(r).toEqual({ data: { title: "Q3", tags: ["sales", "plan"] }, model: "anthropic/claude-sonnet-5", tokensIn: 12, tokensOut: 5 })
  })

  test("a model named by the call is used for that call only", async () => {
    const p = provider("ok")
    const ai = createAi(config, p.get)
    expect((await ai.text({ ...call, model: "openai/gpt-5-mini" })).model).toBe("openai/gpt-5-mini")
    await ai.text(call)
    expect(p.models.get("openai/gpt-5-mini")!.doGenerateCalls).toHaveLength(1)
    expect(p.models.get("anthropic/claude-sonnet-5")!.doGenerateCalls).toHaveLength(1)
  })

  test("one model request per call, with the time limit's abort signal", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new APICallError({ message: "overloaded", url: "https://gateway.test", requestBodyValues: {}, statusCode: 529, isRetryable: true })
      },
    })
    await expect(createAi(config, () => model).text(call)).rejects.toThrow()
    expect(model.doGenerateCalls).toHaveLength(1)
    expect(model.doGenerateCalls[0]!.abortSignal).toBeInstanceOf(AbortSignal)
  })
})

describe("failures", () => {
  const failing = (doGenerate: MockLanguageModelV4["doGenerate"]) => () => new MockLanguageModelV4({ doGenerate })

  test("an answer that does not match the schema throws invalid_output", async () => {
    const p = provider(JSON.stringify({ title: 3 }))
    const r = createAi(config, p.get).object({ ...call, schema: z.object({ title: z.string() }) })
    await expect(r).rejects.toEqual(new AiError("invalid_output"))
  })

  test("a provider error throws provider with its status", async () => {
    const ai = createAi(config, failing(async () => { throw new APICallError({ message: "bad key", url: "https://gateway.test", requestBodyValues: {}, statusCode: 401 }) }))
    const err = await ai.text(call).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AiError)
    expect(err).toMatchObject({ kind: "provider", status: 401 })
  })

  test("the time limit throws timeout", async () => {
    // The SDK builds its limit with AbortSignal.timeout; an already-fired one stands in for 60 s.
    vi.spyOn(AbortSignal, "timeout").mockImplementation(() => AbortSignal.abort(new DOMException("timeout", "TimeoutError")))
    const ai = createAi(config, failing(async ({ abortSignal }) => { throw abortSignal!.reason }))
    await expect(ai.text(call)).rejects.toEqual(new AiError("timeout"))
  })

  test("logs and errors never hold the prompt, instructions, answer, provider body or key", async () => {
    const lines: string[] = []
    vi.spyOn(console, "log").mockImplementation((line: string) => void lines.push(line))
    const log = createLog()
    const body = "upstream said: The quarterly notes."
    const ok = await createAi({ ...config, log }, provider("Secret answer.").get).text(call)
    const err = await createAi({ ...config, log }, failing(async () => { throw new APICallError({ message: body, url: "https://gateway.test", requestBodyValues: { prompt: call.prompt }, statusCode: 500, responseBody: body }) })).text(call).catch((e: unknown) => e)
    // What a route's error handler would log.
    log.error("unhandled", { err })
    expect(ok.text).toBe("Secret answer.")
    expect(lines.map((l) => JSON.parse(l) as { msg: string }).map((l) => l.msg)).toEqual(["ai_call", "ai_failed", "unhandled"])
    for (const secret of [call.prompt, call.instructions, "Secret answer.", body, "test-key"]) for (const line of lines) expect(line).not.toContain(secret)
  })
})

test("createTestAi answers with its text and counts the model requests", async () => {
  const fake = createTestAi(JSON.stringify({ ok: true }))
  expect((await fake.ai.object({ ...call, schema: z.object({ ok: z.boolean() }) })).data).toEqual({ ok: true })
  expect(fake.calls()).toBe(1)
})
