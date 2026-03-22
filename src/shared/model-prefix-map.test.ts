import { describe, it, expect } from "bun:test"
import { toPlatformModel, toCanonicalModel } from "./model-prefix-map"

describe("model prefix map", () => {
  describe("#given direct platform", () => {
    describe("#when converting to platform model", () => {
      it("#then returns the model unchanged", () => {
        expect(toPlatformModel("anthropic/claude-opus-4-6", "direct")).toBe("anthropic/claude-opus-4-6")
      })
    })

    describe("#when converting to canonical model", () => {
      it("#then returns the model unchanged", () => {
        expect(toCanonicalModel("anthropic/claude-opus-4-6", "direct")).toBe("anthropic/claude-opus-4-6")
      })
    })
  })

  describe("#given zen platform", () => {
    describe("#when converting anthropic model to platform", () => {
      it("#then adds zen- prefix", () => {
        expect(toPlatformModel("anthropic/claude-opus-4-6", "zen")).toBe("zen-anthropic/claude-opus-4-6")
      })
    })

    describe("#when converting openai model to platform", () => {
      it("#then adds zen- prefix", () => {
        expect(toPlatformModel("openai/gpt-5.4", "zen")).toBe("zen-openai/gpt-5.4")
      })
    })

    describe("#when converting google model to platform", () => {
      it("#then adds zen- prefix", () => {
        expect(toPlatformModel("google/gemini-2.5-flash", "zen")).toBe("zen-google/gemini-2.5-flash")
      })
    })

    describe("#when converting zen-prefixed model back to canonical", () => {
      it("#then strips zen- prefix", () => {
        expect(toCanonicalModel("zen-anthropic/claude-opus-4-6", "zen")).toBe("anthropic/claude-opus-4-6")
        expect(toCanonicalModel("zen-openai/gpt-5.4", "zen")).toBe("openai/gpt-5.4")
        expect(toCanonicalModel("zen-google/gemini-2.5-flash", "zen")).toBe("google/gemini-2.5-flash")
      })
    })

    describe("#when converting an unknown provider", () => {
      it("#then returns the model unchanged", () => {
        expect(toPlatformModel("mistral/mistral-large", "zen")).toBe("mistral/mistral-large")
      })
    })
  })

  describe("#given roundtrip conversion", () => {
    describe("#when converting to platform then back to canonical", () => {
      it("#then returns the original model", () => {
        const original = "anthropic/claude-sonnet-4-6"
        const platform = toPlatformModel(original, "zen")
        const canonical = toCanonicalModel(platform, "zen")
        expect(canonical).toBe(original)
      })
    })
  })
})
