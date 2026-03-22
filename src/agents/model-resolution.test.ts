import { describe, it, expect } from "bun:test"
import { resolveModel } from "../shared/model-resolution-pipeline"

describe("resolveModel", () => {
  describe("#given override, category, fallback, and system default", () => {
    describe("#when resolveModel is called", () => {
      it("#then override is selected first", () => {
        const result = resolveModel({
          override: "openai/gpt-5.4",
          categoryDefault: "anthropic/claude-sonnet-4-6",
          fallbackChain: ["openai/gpt-5.3-codex"],
          systemDefault: "anthropic/claude-haiku-4-6",
        })

        expect(result).toEqual({
          model: "openai/gpt-5.4",
          source: "override",
        })
      })
    })
  })

  describe("#given category, fallback, and system default but no override", () => {
    describe("#when resolveModel is called", () => {
      it("#then category default is selected second", () => {
        const result = resolveModel({
          categoryDefault: "anthropic/claude-sonnet-4-6",
          fallbackChain: ["openai/gpt-5.3-codex"],
          systemDefault: "anthropic/claude-haiku-4-6",
        })

        expect(result).toEqual({
          model: "anthropic/claude-sonnet-4-6",
          source: "category-default",
        })
      })
    })
  })

  describe("#given fallback and system default but no override or category", () => {
    describe("#when resolveModel is called", () => {
      it("#then first fallback model is selected third", () => {
        const result = resolveModel({
          fallbackChain: ["openai/gpt-5.3-codex", "anthropic/claude-opus-4-6"],
          systemDefault: "anthropic/claude-haiku-4-6",
        })

        expect(result).toEqual({
          model: "openai/gpt-5.3-codex",
          source: "fallback",
        })
      })
    })
  })

  describe("#given only system default", () => {
    describe("#when resolveModel is called", () => {
      it("#then system default is selected last", () => {
        const result = resolveModel({
          systemDefault: "anthropic/claude-haiku-4-6",
        })

        expect(result).toEqual({
          model: "anthropic/claude-haiku-4-6",
          source: "system-default",
        })
      })
    })
  })

  describe("#given no model sources", () => {
    describe("#when resolveModel is called", () => {
      it("#then undefined is returned", () => {
        const result = resolveModel({})
        expect(result).toBeUndefined()
      })
    })
  })
})
