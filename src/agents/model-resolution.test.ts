import { describe, it, expect } from "bun:test";
import { resolveModel } from "../shared/model-resolution-pipeline";

describe("resolveModel", () => {
  describe("#given an explicit override", () => {
    describe("#when resolveModel is called", () => {
      it("#then override is used directly regardless of fallback chain", () => {
        const result = resolveModel({
          override: "openai/gpt-5.4",
          fallbackChain: [{ providers: ["anthropic", "opencode"], model: "claude-opus-4-6" }],
          connectedProviders: ["opencode"],
        });

        expect(result).toEqual({
          model: "openai/gpt-5.4",
          source: "override",
        });
      });
    });
  });

  describe("#given a fallback chain and connected providers", () => {
    describe("#when only opencode is connected", () => {
      it("#then selects the first entry that lists opencode", () => {
        const result = resolveModel({
          fallbackChain: [
            { providers: ["anthropic", "opencode"], model: "claude-opus-4-6", variant: "max" },
            { providers: ["openai", "opencode"], model: "gpt-5.4" },
          ],
          connectedProviders: ["opencode"],
        });

        expect(result).toEqual({
          model: "opencode/claude-opus-4-6",
          source: "fallback",
          variant: "max",
        });
      });
    });

    describe("#when only openai is connected", () => {
      it("#then selects the first entry that lists openai", () => {
        const result = resolveModel({
          fallbackChain: [
            { providers: ["anthropic", "opencode"], model: "claude-opus-4-6", variant: "max" },
            { providers: ["openai", "opencode"], model: "gpt-5.3-codex", variant: "medium" },
          ],
          connectedProviders: ["openai"],
        });

        expect(result).toEqual({
          model: "openai/gpt-5.3-codex",
          source: "fallback",
          variant: "medium",
        });
      });
    });

    describe("#when anthropic and opencode are both connected", () => {
      it("#then selects the first provider listed in the entry", () => {
        const result = resolveModel({
          fallbackChain: [{ providers: ["anthropic", "opencode"], model: "claude-opus-4-6" }],
          connectedProviders: ["anthropic", "opencode"],
        });

        // "anthropic" is listed first in providers, and it's connected
        expect(result).toEqual({
          model: "anthropic/claude-opus-4-6",
          source: "fallback",
        });
      });
    });

    describe("#when no connected provider matches any entry", () => {
      it("#then returns undefined", () => {
        const result = resolveModel({
          fallbackChain: [
            { providers: ["anthropic"], model: "claude-opus-4-6" },
            { providers: ["openai"], model: "gpt-5.4" },
          ],
          connectedProviders: ["google"],
        });

        expect(result).toBeUndefined();
      });
    });
  });

  describe("#given no connected providers (first run)", () => {
    describe("#when connectedProviders is null", () => {
      it("#then returns undefined to let OpenCode handle routing", () => {
        const result = resolveModel({
          fallbackChain: [{ providers: ["openai", "opencode"], model: "gpt-5.3-codex" }],
          connectedProviders: null,
        });

        expect(result).toBeUndefined();
      });
    });
  });

  describe("#given an empty fallback chain", () => {
    describe("#when resolveModel is called", () => {
      it("#then returns undefined", () => {
        const result = resolveModel({
          fallbackChain: [],
          connectedProviders: ["opencode"],
        });

        expect(result).toBeUndefined();
      });
    });
  });

  describe("#given no inputs at all", () => {
    describe("#when resolveModel is called", () => {
      it("#then returns undefined", () => {
        // connectedProviders defaults to disk cache read, which is null in test
        const result = resolveModel({
          connectedProviders: null,
        });

        expect(result).toBeUndefined();
      });
    });
  });

  describe("#given a multi-entry chain with provider priority", () => {
    describe("#when the first entry has no connected providers", () => {
      it("#then falls through to the second entry", () => {
        const result = resolveModel({
          fallbackChain: [
            { providers: ["google"], model: "gemini-3.1-pro", variant: "high" },
            { providers: ["openai", "opencode"], model: "gpt-5.3-codex", variant: "medium" },
            { providers: ["anthropic"], model: "claude-opus-4-6" },
          ],
          connectedProviders: ["opencode"],
        });

        expect(result).toEqual({
          model: "opencode/gpt-5.3-codex",
          source: "fallback",
          variant: "medium",
        });
      });
    });
  });

  describe("#given the real orchestrator fallback chain", () => {
    const orchestratorChain = [
      { providers: ["anthropic", "opencode"], model: "claude-opus-4-6", variant: "max" },
      { providers: ["openai", "opencode"], model: "gpt-5.4", variant: "medium" },
      { providers: ["google", "opencode"], model: "gemini-3.1-pro-preview" },
    ];

    it("#then resolves to opencode/claude-opus-4-6 when only opencode is connected", () => {
      const result = resolveModel({
        fallbackChain: orchestratorChain,
        connectedProviders: ["opencode"],
      });

      expect(result?.model).toBe("opencode/claude-opus-4-6");
      expect(result?.variant).toBe("max");
    });

    it("#then resolves to anthropic/claude-opus-4-6 when anthropic is connected", () => {
      const result = resolveModel({
        fallbackChain: orchestratorChain,
        connectedProviders: ["anthropic"],
      });

      expect(result?.model).toBe("anthropic/claude-opus-4-6");
    });

    it("#then resolves to openai/gpt-5.4 when only openai is connected", () => {
      const result = resolveModel({
        fallbackChain: orchestratorChain,
        connectedProviders: ["openai"],
      });

      expect(result?.model).toBe("openai/gpt-5.4");
      expect(result?.variant).toBe("medium");
    });
  });
});
