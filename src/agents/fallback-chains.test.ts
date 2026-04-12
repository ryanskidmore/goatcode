import { describe, it, expect } from "bun:test";
import { buildCustomFallbackChain, mergeFallbackChains } from "./fallback-chains";

describe("buildCustomFallbackChain", () => {
  describe("#given a single qualified model string", () => {
    describe("#when provider and model are separated by slash", () => {
      it("#then returns entry with extracted provider plus opencode", () => {
        const result = buildCustomFallbackChain("anthropic/claude-opus-4-6");
        expect(result).toEqual([
          { providers: ["anthropic", "opencode"], model: "claude-opus-4-6" },
        ]);
      });
    });

    describe("#when provider is openai", () => {
      it("#then extracts openai as provider", () => {
        const result = buildCustomFallbackChain("openai/gpt-5.4");
        expect(result).toEqual([{ providers: ["openai", "opencode"], model: "gpt-5.4" }]);
      });
    });

    describe("#when provider is google", () => {
      it("#then extracts google as provider", () => {
        const result = buildCustomFallbackChain("google/gemini-3.1-pro");
        expect(result).toEqual([{ providers: ["google", "opencode"], model: "gemini-3.1-pro" }]);
      });
    });
  });

  describe("#given a single unqualified model string (no slash)", () => {
    describe("#when no provider prefix is present", () => {
      it("#then returns entry with opencode-only provider list", () => {
        const result = buildCustomFallbackChain("claude-sonnet-4-6");
        expect(result).toEqual([{ providers: ["opencode"], model: "claude-sonnet-4-6" }]);
      });
    });
  });

  describe("#given an array of model strings", () => {
    describe("#when mixing qualified and unqualified models", () => {
      it("#then processes each entry independently", () => {
        const result = buildCustomFallbackChain(["openai/gpt-5.4", "claude-sonnet-4-6"]);
        expect(result).toEqual([
          { providers: ["openai", "opencode"], model: "gpt-5.4" },
          { providers: ["opencode"], model: "claude-sonnet-4-6" },
        ]);
      });
    });

    describe("#when all models are qualified", () => {
      it("#then returns correct entries for each", () => {
        const result = buildCustomFallbackChain([
          "anthropic/claude-opus-4-6",
          "openai/gpt-5.3-codex",
        ]);
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          providers: ["anthropic", "opencode"],
          model: "claude-opus-4-6",
        });
        expect(result[1]).toEqual({
          providers: ["openai", "opencode"],
          model: "gpt-5.3-codex",
        });
      });
    });

    describe("#when a single-element array is provided", () => {
      it("#then returns a single-entry chain", () => {
        const result = buildCustomFallbackChain(["anthropic/claude-sonnet-4-6"]);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          providers: ["anthropic", "opencode"],
          model: "claude-sonnet-4-6",
        });
      });
    });
  });

  describe("#given a model string where only the first slash is the separator", () => {
    describe("#when provider is a simple name and model contains no additional slashes", () => {
      it("#then splits only on the first slash", () => {
        const result = buildCustomFallbackChain("openai/gpt-5.4-mini");
        expect(result).toEqual([{ providers: ["openai", "opencode"], model: "gpt-5.4-mini" }]);
      });
    });
  });
});

// ─── A22: fallback_models config field consumed by compositor ────────────────

describe("A22 — fallback_models override reaches compositor", () => {
  it("uses custom chain instead of built-in chain when fallback_models is set", async () => {
    const { buildCustomFallbackChain } = await import("./fallback-chains");
    const { resolveModel } = await import("../shared/model-resolution-pipeline");

    const customChain = buildCustomFallbackChain(["openai/gpt-5.4"]);
    const result = resolveModel({ fallbackChain: customChain, connectedProviders: ["openai"] });

    expect(result?.model).toBe("openai/gpt-5.4");
    expect(result?.variant).toBeUndefined();
  });

  it("uses opencode/ prefix for unqualified model in custom chain", async () => {
    const { buildCustomFallbackChain } = await import("./fallback-chains");
    const { resolveModel } = await import("../shared/model-resolution-pipeline");

    const customChain = buildCustomFallbackChain("my-custom-model");
    const result = resolveModel({ fallbackChain: customChain, connectedProviders: ["opencode"] });

    expect(result?.model).toBe("opencode/my-custom-model");
  });
});

describe("mergeFallbackChains", () => {
  const defaults = [
    { providers: ["anthropic", "opencode"], model: "claude-opus-4-6", variant: "max" as const },
    { providers: ["openai", "opencode"], model: "gpt-5.4", variant: "medium" as const },
  ];

  it("replaces defaults by default when overrides are provided", () => {
    const merged = mergeFallbackChains({
      defaults,
      overrides: ["google/gemini-3.1-pro"],
    });

    expect(merged).toEqual([{ providers: ["google", "opencode"], model: "gemini-3.1-pro" }]);
  });

  it("appends overrides when fallback_mode is append", () => {
    const merged = mergeFallbackChains({
      defaults,
      overrides: ["google/gemini-3.1-pro"],
      mode: "append",
    });

    expect(merged).toEqual([
      ...defaults,
      { providers: ["google", "opencode"], model: "gemini-3.1-pro" },
    ]);
  });

  it("prepends overrides when fallback_mode is prepend", () => {
    const merged = mergeFallbackChains({
      defaults,
      overrides: ["google/gemini-3.1-pro"],
      mode: "prepend",
    });

    expect(merged).toEqual([
      { providers: ["google", "opencode"], model: "gemini-3.1-pro" },
      ...defaults,
    ]);
  });
});
