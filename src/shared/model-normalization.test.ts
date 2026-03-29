import { describe, expect, it } from "bun:test";
import { normalizeModel, parseModelId } from "./model-normalization";

describe("normalizeModel", () => {
  describe("given undefined input", () => {
    it("returns undefined", () => {
      expect(normalizeModel(undefined)).toBeUndefined();
    });
  });

  describe("given empty string", () => {
    it("returns undefined", () => {
      expect(normalizeModel("")).toBeUndefined();
    });
  });

  describe("given whitespace-only string", () => {
    it("returns undefined", () => {
      expect(normalizeModel("   ")).toBeUndefined();
    });
  });

  describe("given model with leading/trailing whitespace", () => {
    it("trims whitespace", () => {
      expect(normalizeModel("  openai/gpt-4  ")).toBe("openai/gpt-4");
    });
  });

  describe("given model with uppercase letters", () => {
    it("lowercases the result", () => {
      expect(normalizeModel("OpenAI/GPT-4")).toBe("openai/gpt-4");
    });
  });

  describe("given already normalized model", () => {
    it("returns unchanged", () => {
      expect(normalizeModel("anthropic/claude-3")).toBe("anthropic/claude-3");
    });
  });
});

describe("parseModelId", () => {
  describe("given model without slash", () => {
    it("returns undefined", () => {
      expect(parseModelId("gpt-4")).toBeUndefined();
    });
  });

  describe("given empty string", () => {
    it("returns undefined", () => {
      expect(parseModelId("")).toBeUndefined();
    });
  });

  describe("given valid provider/model format", () => {
    it("splits on first slash", () => {
      expect(parseModelId("openai/gpt-4")).toEqual({ provider: "openai", modelId: "gpt-4" });
    });
  });

  describe("given model with multiple slashes", () => {
    it("splits on first slash only", () => {
      expect(parseModelId("openai/gpt-4/turbo")).toEqual({
        provider: "openai",
        modelId: "gpt-4/turbo",
      });
    });
  });

  describe("given model with uppercase", () => {
    it("normalizes before parsing", () => {
      expect(parseModelId("OpenAI/GPT-4")).toEqual({ provider: "openai", modelId: "gpt-4" });
    });
  });
});
