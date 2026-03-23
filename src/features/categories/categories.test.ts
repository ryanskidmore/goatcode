import { describe, expect, it } from "bun:test"
import { CategoryResolver, resolveCategory } from "./category-resolver"

describe("category-resolver", () => {
  describe("#given built-in category names", () => {
    describe("#when resolve is called", () => {
      it("#then resolves each category to its default model", () => {
        const resolver = new CategoryResolver()

        expect(resolver.resolve("visual-engineering")?.model).toBe("google/gemini-3.1-pro")
        expect(resolver.resolve("ultrabrain")?.model).toBe("openai/gpt-5.4")
        expect(resolver.resolve("deep")?.model).toBe("openai/gpt-5.3-codex")
        expect(resolver.resolve("artistry")?.model).toBe("google/gemini-3.1-pro")
        expect(resolver.resolve("quick")?.model).toBe("openai/gpt-5.4-mini")
        expect(resolver.resolve("unspecified-low")?.model).toBe("anthropic/claude-sonnet-4-6")
        expect(resolver.resolve("unspecified-high")?.model).toBe("anthropic/claude-opus-4-6")
        expect(resolver.resolve("writing")?.model).toBe("kimi-for-coding/k2p5")
      })
    })
  })

  describe("#given category overrides", () => {
    describe("#when model override is provided", () => {
      it("#then override model takes precedence over defaults", () => {
        const resolver = new CategoryResolver()

        const resolved = resolver.resolve("visual-engineering", {
          "visual-engineering": {
            model: "custom/model",
          },
        })

        expect(resolved?.model).toBe("custom/model")
      })
    })

    describe("#when resolveCategory helper is called with overrides", () => {
      it("#then returns merged category config", () => {
        const resolved = resolveCategory("writing", {
          writing: {
            model: "custom/writer-model",
            variant: "high",
          },
        })

        expect(resolved?.model).toBe("custom/writer-model")
        expect(resolved?.variant).toBe("high")
        expect(typeof resolved?.prompt_append).toBe("string")
      })
    })
  })

  describe("#given an unknown category", () => {
    describe("#when resolve is called", () => {
      it("#then returns undefined", () => {
        const resolver = new CategoryResolver()
        expect(resolver.resolve("not-a-category")).toBeUndefined()
      })
    })
  })
})
