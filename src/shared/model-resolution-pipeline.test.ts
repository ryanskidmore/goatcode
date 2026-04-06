import { describe, expect, it } from "bun:test";
import { resolveModel, resolveQualifiedModel } from "./model-resolution-pipeline";

describe("resolveModel (provider-aware pipeline)", () => {
  describe("given an override", () => {
    it("returns override regardless of other inputs", () => {
      const result = resolveModel({
        override: "openai/gpt-4",
        fallbackChain: [{ providers: ["anthropic"], model: "claude-3" }],
        connectedProviders: ["anthropic"],
      });
      expect(result).toEqual({ model: "openai/gpt-4", source: "override" });
    });

    it("normalizes the override model", () => {
      const result = resolveModel({
        override: "  OpenAI/GPT-4  ",
        connectedProviders: [],
      });
      expect(result).toEqual({ model: "openai/gpt-4", source: "override" });
    });
  });

  describe("given a fallback chain with connected providers", () => {
    it("returns first entry matching a connected provider", () => {
      const result = resolveModel({
        fallbackChain: [
          { providers: ["anthropic", "opencode"], model: "claude-opus-4-6", variant: "max" },
          { providers: ["openai"], model: "gpt-5.4" },
        ],
        connectedProviders: ["opencode"],
      });
      expect(result).toEqual({
        model: "opencode/claude-opus-4-6",
        source: "fallback",
        variant: "max",
      });
    });

    it("skips entries with no matching connected provider", () => {
      const result = resolveModel({
        fallbackChain: [
          { providers: ["google"], model: "gemini-pro" },
          { providers: ["openai", "opencode"], model: "gpt-5.4" },
        ],
        connectedProviders: ["opencode"],
      });
      expect(result).toEqual({
        model: "opencode/gpt-5.4",
        source: "fallback",
      });
    });

    it("prefers earlier provider in the entry's providers list", () => {
      const result = resolveModel({
        fallbackChain: [{ providers: ["anthropic", "opencode"], model: "claude-opus-4-6" }],
        connectedProviders: ["anthropic", "opencode"],
      });
      expect(result).toEqual({
        model: "anthropic/claude-opus-4-6",
        source: "fallback",
      });
    });
  });

  describe("given null connected providers (first run)", () => {
    it("returns undefined to let OpenCode handle routing", () => {
      const result = resolveModel({
        fallbackChain: [{ providers: ["openai"], model: "gpt-5.4" }],
        connectedProviders: null,
      });
      expect(result).toBeUndefined();
    });
  });

  describe("given no inputs", () => {
    it("returns undefined", () => {
      expect(resolveModel({ connectedProviders: null })).toBeUndefined();
    });
  });

  describe("given empty override string", () => {
    it("falls through to fallback chain", () => {
      const result = resolveModel({
        override: "   ",
        fallbackChain: [{ providers: ["opencode"], model: "gpt-5.4" }],
        connectedProviders: ["opencode"],
      });
      expect(result).toEqual({
        model: "opencode/gpt-5.4",
        source: "fallback",
      });
    });
  });
});

describe("resolveQualifiedModel (runtime fallback hooks)", () => {
  describe("given an override", () => {
    it("returns override directly", () => {
      const result = resolveQualifiedModel({
        override: "openai/gpt-4",
        fallbackChain: ["anthropic/claude-3"],
        availableModels: new Set(["anthropic/claude-3"]),
      });
      expect(result).toEqual({ model: "openai/gpt-4", source: "override" });
    });
  });

  describe("given a fallback chain with available models", () => {
    it("returns first available model", () => {
      const result = resolveQualifiedModel({
        fallbackChain: ["unavailable/model", "openai/gpt-4", "google/gemini-pro"],
        availableModels: new Set(["openai/gpt-4", "google/gemini-pro"]),
      });
      expect(result).toEqual({ model: "openai/gpt-4", source: "fallback" });
    });

    it("skips unavailable models", () => {
      const result = resolveQualifiedModel({
        fallbackChain: ["unavailable/a", "unavailable/b", "openai/gpt-4"],
        availableModels: new Set(["openai/gpt-4"]),
      });
      expect(result).toEqual({ model: "openai/gpt-4", source: "fallback" });
    });
  });

  describe("given no available matches", () => {
    it("returns undefined", () => {
      const result = resolveQualifiedModel({
        fallbackChain: ["unavailable/a", "unavailable/b"],
        availableModels: new Set(["something/else"]),
      });
      expect(result).toBeUndefined();
    });
  });
});
