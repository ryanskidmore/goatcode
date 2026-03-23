declare const require: (name: string) => any

const { describe, expect, it, mock } = require("bun:test")
import { createModelFallbackHandler, modelFallbackPlugin } from "./model-fallback"
import { createRuntimeFallbackHandler, runtimeFallbackPlugin } from "./runtime-fallback"
import {
  createPreemptiveCompactionHandler,
  preemptiveCompactionPlugin,
} from "./preemptive-compaction"

describe("model management hooks", () => {
  describe("#given model-fallback receives rate-limit errors", () => {
    describe("#when session.error is emitted with status 429", () => {
      it("#then switches to the next model in fallback chain", async () => {
        const sessionModels = new Map<string, string>([["ses-model", "openai/gpt-5"]])
        const onFallbackApplied = mock(() => undefined)

        const handler = createModelFallbackHandler({
          getCurrentModel: (sessionID) => sessionModels.get(sessionID),
          setCurrentModel: (sessionID, model) => {
            sessionModels.set(sessionID, model)
          },
          onFallbackApplied,
        })

        await handler({
          event: {
            type: "session.error",
            properties: {
              sessionID: "ses-model",
              model: "openai/gpt-5",
              error: { statusCode: 429, message: "Too many requests" },
              fallbackChain: ["openai/gpt-5", "openai/gpt-4.1-mini", "anthropic/claude-3.7-sonnet"],
            },
          },
        })

        expect(sessionModels.get("ses-model")).toBe("openai/gpt-4.1-mini")
        expect(onFallbackApplied).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe("#given runtime-fallback receives model/runtime errors", () => {
    describe("#when session.error reports model not found", () => {
      it("#then switches to a compatible fallback model", async () => {
        const sessionModels = new Map<string, string>([["ses-runtime", "openai/gpt-5"]])

        const handler = createRuntimeFallbackHandler({
          getCurrentModel: (sessionID) => sessionModels.get(sessionID),
          setCurrentModel: (sessionID, model) => {
            sessionModels.set(sessionID, model)
          },
        })

        await handler({
          event: {
            type: "session.error",
            properties: {
              sessionID: "ses-runtime",
              model: "openai/gpt-5",
              error: { message: "Model not found for this provider" },
              fallbackChain: ["anthropic/claude-3.7-sonnet", "openai/gpt-4.1-mini", "google/gemini-2.5-pro"],
            },
          },
        })

        expect(sessionModels.get("ses-runtime")).toBe("openai/gpt-4.1-mini")
      })
    })
  })

  describe("#given preemptive-compaction monitors token usage", () => {
    describe("#when usage crosses and recrosses the 80% threshold", () => {
      it("#then triggers compaction once per high-usage window", async () => {
        const compactSession = mock(() => Promise.resolve())
        const handler = createPreemptiveCompactionHandler({ compactSession })

        await handler({
          sessionID: "ses-compact",
          usage: { inputTokens: 170_000, cacheReadTokens: 0 },
          contextLimit: 200_000,
        })

        await handler({
          sessionID: "ses-compact",
          usage: { inputTokens: 175_000, cacheReadTokens: 0 },
          contextLimit: 200_000,
        })

        await handler({
          sessionID: "ses-compact",
          usage: { inputTokens: 100_000, cacheReadTokens: 0 },
          contextLimit: 200_000,
        })

        await handler({
          sessionID: "ses-compact",
          usage: { inputTokens: 180_000, cacheReadTokens: 0 },
          contextLimit: 200_000,
        })

        expect(compactSession).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe("#given hook micro-plugins are created", () => {
    describe("#when each plugin registers hooks", () => {
      it("#then wires event/message handlers through definePlugin", () => {
        expect(typeof modelFallbackPlugin.hooks?.event).toBe("function")
        expect(typeof runtimeFallbackPlugin.hooks?.event).toBe("function")
        expect(typeof preemptiveCompactionPlugin.hooks?.["chat.message"]).toBe("function")
      })
    })
  })
})
