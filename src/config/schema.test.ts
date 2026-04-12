import { describe, expect, test } from "bun:test";
import { defineConfig } from "./define-config";
import { validateConfig } from "./validator";

describe("validateConfig", () => {
  describe("with valid config", () => {
    test("accepts empty config", () => {
      //#given
      const raw = {};

      //#when
      const result = validateConfig(raw);

      //#then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.config.auto_update).toBe(true);
        expect(result.config.disabled_agents).toEqual([]);
        expect(result.config.disabled_hooks).toEqual([]);
        expect(result.config.disabled_tools).toEqual([]);
        expect(result.config.disabled_skills).toEqual([]);
      }
    });

    test("accepts agent model override", () => {
      //#given
      const raw = { agents: { orchestrator: { model: "anthropic/claude-opus-4-6" } } };

      //#when
      const result = validateConfig(raw);

      //#then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.config.agents?.orchestrator?.model).toBe("anthropic/claude-opus-4-6");
      }
    });

    test("accepts fallback mode and fallback models for agents and categories", () => {
      //#given
      const raw = {
        agents: {
          orchestrator: {
            fallback_models: ["openai/gpt-5.4", "anthropic/claude-opus-4-6"],
            fallback_mode: "append",
          },
        },
        categories: {
          deep: {
            fallback_models: "openai/gpt-5.3-codex",
            fallback_mode: "prepend",
          },
        },
      };

      //#when
      const result = validateConfig(raw);

      //#then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.config.agents?.orchestrator?.fallback_mode).toBe("append");
        expect(result.config.categories?.deep?.fallback_mode).toBe("prepend");
      }
    });
  });

  describe("with invalid config", () => {
    test("rejects non-numeric temperature", () => {
      //#given
      const raw = { agents: { orchestrator: { temperature: "hot" } } };

      //#when
      const result = validateConfig(raw);

      //#then
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain("temperature");
      }
    });
  });
});

describe("defineConfig", () => {
  test("returns config unchanged", () => {
    //#given
    const config = { agents: { orchestrator: { model: "test" } } };

    //#when
    const result = defineConfig(config);

    //#then
    expect(result).toBe(config);
  });
});
