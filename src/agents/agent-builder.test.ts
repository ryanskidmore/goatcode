import { describe, it, expect } from "bun:test"
import { buildAgent } from "./agent-builder"
import type { AgentFactory } from "../types/agent"

describe("buildAgent", () => {
  describe("#given a factory config with category defaults and user overrides", () => {
    describe("#when buildAgent is called", () => {
      it("#then user overrides win over base and category values", () => {
        const source = Object.assign(
          (model: string) => ({
            model,
            temperature: 0.1,
            top_p: 0.2,
            prompt: "base prompt",
            tools: { read: true, write: true },
          }),
          { mode: "all" as const },
        ) satisfies AgentFactory

        const result = buildAgent(
          source,
          "openai/gpt-5.3-codex",
          {
            model: "anthropic/claude-sonnet-4-6",
            prompt_append: "category append",
          },
          {
            model: "openai/gpt-5.4",
            temperature: 0.7,
            top_p: 0.9,
            prompt_append: "override append",
            denied_tools: ["write", "edit"],
          },
        )

        expect(result.model).toBe("openai/gpt-5.4")
        expect(result.temperature).toBe(0.7)
        expect(result.top_p).toBe(0.9)
        expect(result.prompt).toBe("base prompt\n\ncategory append\n\noverride append")
        expect(result.tools).toEqual({
          read: true,
          write: false,
          edit: false,
        })
      })
    })
  })

  describe("#given a base config without model and no overrides", () => {
    describe("#when buildAgent is called with category model", () => {
      it("#then category model fills the missing base model", () => {
        const result = buildAgent(
          {
            prompt: "base",
          },
          "openai/gpt-5.3-codex",
          {
            model: "anthropic/claude-sonnet-4-6",
          },
        )

        expect(result.model).toBe("anthropic/claude-sonnet-4-6")
      })
    })
  })
})
