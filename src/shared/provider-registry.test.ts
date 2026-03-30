import { describe, expect, it, beforeEach } from "bun:test";
import {
  isQualifiedModel,
  findMatchingProviders,
  resolveProvider,
  qualifyModel,
  registerProvider,
  unregisterProvider,
  getRegisteredProviders,
  resetProviders,
  type ProviderDefinition,
} from "./provider-registry";

describe("isQualifiedModel", () => {
  describe("given qualified model with slash", () => {
    it("returns true", () => {
      expect(isQualifiedModel("anthropic/claude-opus-4-6")).toBe(true);
    });
  });

  describe("given bare model without slash", () => {
    it("returns false", () => {
      expect(isQualifiedModel("claude-opus-4-6")).toBe(false);
    });
  });
});

describe("findMatchingProviders", () => {
  beforeEach(() => {
    resetProviders();
  });

  describe("given claude model", () => {
    it("matches anthropic and opencode", () => {
      const matches = findMatchingProviders("claude-opus-4-6");
      expect(matches.length).toBe(2);
      expect(matches[0]?.id).toBe("anthropic");
      expect(matches[0]?.priority).toBe(0);
      expect(matches[1]?.id).toBe("opencode");
      expect(matches[1]?.priority).toBe(10);
    });
  });

  describe("given gpt model", () => {
    it("matches openai and opencode", () => {
      const matches = findMatchingProviders("gpt-5.4");
      expect(matches.length).toBe(2);
      expect(matches[0]?.id).toBe("openai");
      expect(matches[0]?.priority).toBe(0);
      expect(matches[1]?.id).toBe("opencode");
      expect(matches[1]?.priority).toBe(10);
    });
  });

  describe("given gemini model", () => {
    it("matches google and opencode", () => {
      const matches = findMatchingProviders("gemini-2.5-pro");
      expect(matches.length).toBe(2);
      expect(matches[0]?.id).toBe("google");
      expect(matches[0]?.priority).toBe(0);
      expect(matches[1]?.id).toBe("opencode");
      expect(matches[1]?.priority).toBe(10);
    });
  });

  describe("given unknown model", () => {
    it("returns empty array", () => {
      const matches = findMatchingProviders("unknown-model");
      expect(matches.length).toBe(0);
    });
  });

  describe("given model with uppercase", () => {
    it("normalizes and matches", () => {
      const matches = findMatchingProviders("CLAUDE-OPUS");
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]?.id).toBe("anthropic");
    });
  });

  describe("given model with whitespace", () => {
    it("trims and matches", () => {
      const matches = findMatchingProviders("  gpt-4  ");
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]?.id).toBe("openai");
    });
  });
});

describe("resolveProvider", () => {
  beforeEach(() => {
    resetProviders();
  });

  describe("given bare claude model", () => {
    it("resolves to anthropic", () => {
      const result = resolveProvider("claude-opus-4-6");
      expect(result).toEqual({
        qualifiedModel: "anthropic/claude-opus-4-6",
        providerId: "anthropic",
      });
    });
  });

  describe("given bare gpt model", () => {
    it("resolves to openai", () => {
      const result = resolveProvider("gpt-5.4");
      expect(result).toEqual({
        qualifiedModel: "openai/gpt-5.4",
        providerId: "openai",
      });
    });
  });

  describe("given bare gemini model", () => {
    it("resolves to google", () => {
      const result = resolveProvider("gemini-2.5-pro");
      expect(result).toEqual({
        qualifiedModel: "google/gemini-2.5-pro",
        providerId: "google",
      });
    });
  });

  describe("given already qualified model", () => {
    it("passes through unchanged", () => {
      const result = resolveProvider("opencode/claude-opus-4-6");
      expect(result).toEqual({
        qualifiedModel: "opencode/claude-opus-4-6",
        providerId: "opencode",
      });
    });
  });

  describe("given bare model with preferred provider", () => {
    it("uses preferred provider when available", () => {
      const result = resolveProvider("claude-opus-4-6", "opencode");
      expect(result).toEqual({
        qualifiedModel: "opencode/claude-opus-4-6",
        providerId: "opencode",
      });
    });
  });

  describe("given empty string", () => {
    it("returns undefined", () => {
      expect(resolveProvider("")).toBeUndefined();
    });
  });

  describe("given whitespace-only string", () => {
    it("returns undefined", () => {
      expect(resolveProvider("   ")).toBeUndefined();
    });
  });

  describe("given o-series models", () => {
    it("resolves o3 to openai", () => {
      const result = resolveProvider("o3");
      expect(result?.providerId).toBe("openai");
    });

    it("resolves o1-mini to openai", () => {
      const result = resolveProvider("o1-mini");
      expect(result?.providerId).toBe("openai");
    });

    it("resolves o4-mini to openai", () => {
      const result = resolveProvider("o4-mini");
      expect(result?.providerId).toBe("openai");
    });
  });

  describe("given model with uppercase", () => {
    it("normalizes and resolves", () => {
      const result = resolveProvider("GPT-4");
      expect(result?.providerId).toBe("openai");
      expect(result?.qualifiedModel).toBe("openai/gpt-4");
    });
  });

  describe("given unknown model", () => {
    it("returns undefined", () => {
      expect(resolveProvider("unknown-model")).toBeUndefined();
    });
  });
});

describe("qualifyModel", () => {
  beforeEach(() => {
    resetProviders();
  });

  describe("given bare model", () => {
    it("returns qualified model", () => {
      expect(qualifyModel("claude-opus-4-6")).toBe("anthropic/claude-opus-4-6");
    });
  });

  describe("given already qualified model", () => {
    it("passes through unchanged", () => {
      expect(qualifyModel("openai/gpt-4")).toBe("openai/gpt-4");
    });
  });

  describe("given unknown model", () => {
    it("returns as-is", () => {
      expect(qualifyModel("unknown-model")).toBe("unknown-model");
    });
  });

  describe("given bare model with preferred provider", () => {
    it("uses preferred provider", () => {
      expect(qualifyModel("claude-opus-4-6", "opencode")).toBe(
        "opencode/claude-opus-4-6"
      );
    });
  });
});

describe("registerProvider", () => {
  beforeEach(() => {
    resetProviders();
  });

  describe("given custom provider", () => {
    it("gets used in resolution", () => {
      const customProvider: ProviderDefinition = {
        id: "custom",
        patterns: [/^custom-/],
        priority: 5,
      };
      registerProvider(customProvider);

      const result = resolveProvider("custom-model");
      expect(result?.providerId).toBe("custom");
      expect(result?.qualifiedModel).toBe("custom/custom-model");
    });
  });

  describe("given provider with same id as existing", () => {
    it("replaces the existing provider", () => {
      const customProvider: ProviderDefinition = {
        id: "anthropic",
        patterns: [/^test-/],
        priority: 5,
      };
      registerProvider(customProvider);

      const providers = getRegisteredProviders();
      const anthropic = providers.find((p) => p.id === "anthropic");
      expect(anthropic?.patterns).toEqual([/^test-/]);
    });
  });
});

describe("unregisterProvider", () => {
  beforeEach(() => {
    resetProviders();
  });

  describe("given existing provider id", () => {
    it("removes provider and returns true", () => {
      const result = unregisterProvider("anthropic");
      expect(result).toBe(true);

      const matches = findMatchingProviders("claude-opus");
      expect(matches.find((p) => p.id === "anthropic")).toBeUndefined();
    });
  });

  describe("given unknown provider id", () => {
    it("returns false", () => {
      const result = unregisterProvider("unknown");
      expect(result).toBe(false);
    });
  });
});

describe("getRegisteredProviders", () => {
  beforeEach(() => {
    resetProviders();
  });

  describe("given multiple providers", () => {
    it("returns sorted by priority", () => {
      const providers = getRegisteredProviders();
      for (let i = 0; i < providers.length - 1; i++) {
        expect(providers[i]!.priority).toBeLessThanOrEqual(
          providers[i + 1]!.priority
        );
      }
    });
  });

  describe("given custom provider registration", () => {
    it("includes custom provider in sorted list", () => {
      const customProvider: ProviderDefinition = {
        id: "custom",
        patterns: [/^custom-/],
        priority: 5,
      };
      registerProvider(customProvider);

      const providers = getRegisteredProviders();
      expect(providers.find((p) => p.id === "custom")).toBeDefined();
    });
  });
});

describe("resetProviders", () => {
  describe("given custom provider registration", () => {
    it("restores built-in providers", () => {
      const customProvider: ProviderDefinition = {
        id: "custom",
        patterns: [/^custom-/],
        priority: 5,
      };
      registerProvider(customProvider);

      resetProviders();

      const providers = getRegisteredProviders();
      expect(providers.find((p) => p.id === "custom")).toBeUndefined();
      expect(providers.find((p) => p.id === "anthropic")).toBeDefined();
      expect(providers.find((p) => p.id === "openai")).toBeDefined();
      expect(providers.find((p) => p.id === "google")).toBeDefined();
      expect(providers.find((p) => p.id === "opencode")).toBeDefined();
    });
  });

  describe("given unregistered provider", () => {
    it("restores unregistered provider", () => {
      unregisterProvider("anthropic");

      resetProviders();

      const providers = getRegisteredProviders();
      expect(providers.find((p) => p.id === "anthropic")).toBeDefined();
    });
  });
});
