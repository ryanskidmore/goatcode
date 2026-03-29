import { describe, expect, it } from "bun:test";
import { resolveModel } from "./model-resolution-pipeline";

describe("resolveModel", () => {
  describe("given an override", () => {
    it("returns override regardless of other inputs", () => {
      const result = resolveModel({
        override: "openai/gpt-4",
        categoryDefault: "anthropic/claude-3",
        fallbackChain: ["google/gemini-pro"],
        systemDefault: "openai/gpt-3.5-turbo",
      });
      expect(result).toEqual({ model: "openai/gpt-4", source: "override" });
    });

    it("normalizes the override model", () => {
      const result = resolveModel({ override: "  OpenAI/GPT-4  " });
      expect(result).toEqual({ model: "openai/gpt-4", source: "override" });
    });
  });

  describe("given no override but a category default", () => {
    it("returns category default when available", () => {
      const result = resolveModel({
        categoryDefault: "anthropic/claude-3",
        availableModels: new Set(["anthropic/claude-3"]),
      });
      expect(result).toEqual({ model: "anthropic/claude-3", source: "category-default" });
    });

    it("skips category default when not available", () => {
      const result = resolveModel({
        categoryDefault: "anthropic/claude-3",
        fallbackChain: ["openai/gpt-4"],
        availableModels: new Set(["openai/gpt-4"]),
      });
      expect(result).toEqual({ model: "openai/gpt-4", source: "fallback" });
    });

    it("returns category default when no availability constraint", () => {
      const result = resolveModel({
        categoryDefault: "anthropic/claude-3",
        availableModels: new Set(),
      });
      expect(result).toEqual({ model: "anthropic/claude-3", source: "category-default" });
    });
  });

  describe("given no override and no category default, but a fallback chain", () => {
    it("returns first available fallback", () => {
      const result = resolveModel({
        fallbackChain: ["unavailable/model", "openai/gpt-4", "google/gemini-pro"],
        availableModels: new Set(["openai/gpt-4", "google/gemini-pro"]),
      });
      expect(result).toEqual({ model: "openai/gpt-4", source: "fallback" });
    });

    it("skips unavailable fallbacks", () => {
      const result = resolveModel({
        fallbackChain: ["unavailable/model-a", "unavailable/model-b", "openai/gpt-4"],
        availableModels: new Set(["openai/gpt-4"]),
      });
      expect(result).toEqual({ model: "openai/gpt-4", source: "fallback" });
    });
  });

  describe("given only a system default", () => {
    it("returns system default as last resort", () => {
      const result = resolveModel({
        systemDefault: "openai/gpt-3.5-turbo",
      });
      expect(result).toEqual({ model: "openai/gpt-3.5-turbo", source: "system-default" });
    });

    it("returns system default when it is in available models", () => {
      const result = resolveModel({
        categoryDefault: "anthropic/claude-3",
        fallbackChain: ["google/gemini-pro"],
        systemDefault: "openai/gpt-3.5-turbo",
        availableModels: new Set(["openai/gpt-3.5-turbo"]),
      });
      expect(result).toEqual({ model: "openai/gpt-3.5-turbo", source: "system-default" });
    });

    it("returns undefined when system default is not available", () => {
      const result = resolveModel({
        categoryDefault: "anthropic/claude-3",
        fallbackChain: ["google/gemini-pro"],
        systemDefault: "openai/gpt-3.5-turbo",
        availableModels: new Set(["openai/gpt-4"]),
      });
      expect(result).toBeUndefined();
    });
  });

  describe("given no inputs", () => {
    it("returns undefined", () => {
      expect(resolveModel({})).toBeUndefined();
    });
  });

  describe("given empty override string", () => {
    it("falls through to next step", () => {
      const result = resolveModel({
        override: "   ",
        systemDefault: "openai/gpt-3.5-turbo",
      });
      expect(result).toEqual({ model: "openai/gpt-3.5-turbo", source: "system-default" });
    });
  });
});
