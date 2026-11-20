import { MockLanguageModelV4 } from "ai/test"

import { createAi } from "./index"

const noop = () => {}

// An Ai whose model always answers `text` (JSON for `object`): no key, no network. `calls()` counts
// the model requests that reached it.
export function createTestAi(text: string) {
  const model = new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: { inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } },
      warnings: [],
    },
  })
  return { ai: createAi({ apiKey: "test", model: "test/model", log: { info: noop, warn: noop, error: noop } }, () => model), calls: () => model.doGenerateCalls.length }
}
