import { beforeEach, describe, expect, it } from "bun:test";
import {
  buildDiscoveryIndex,
  initializeDiscovery,
  resetDiscovery,
  type ProviderListResponse,
} from "./provider-discovery";
import {
  findProvidersForModel,
  getProviderPriority,
  inferProviderFromModelName,
  isQualifiedModel,
  qualifyModel,
  registerProviderModelMap,
  resetProviderRegistry,
  resolveProvider,
  setDefaultPreferredProvider,
  setProviderPriority,
} from "./provider-registry";

function createProviderListResponse(connected: string[]): ProviderListResponse {
  return {
    all: [
      {
        id: "anthropic",
        name: "Anthropic",
        env: ["ANTHROPIC_API_KEY"],
        models: {
          "claude-opus-4-6": { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
        },
      },
      {
        id: "opencode",
        name: "OpenCode",
        env: [],
        models: {
          "claude-opus-4-6": { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
          "gpt-5.4": { id: "gpt-5.4", name: "GPT 5.4" },
          "gemini-3.1-flash-lite": {
            id: "gemini-3.1-flash-lite",
            name: "Gemini 3.1 Flash Lite",
          },
        },
      },
      {
        id: "openai",
        name: "OpenAI",
        env: ["OPENAI_API_KEY"],
        models: {
          "gpt-5.4": { id: "gpt-5.4", name: "GPT 5.4" },
        },
      },
      {
        id: "google",
        name: "Google",
        env: ["GOOGLE_API_KEY"],
        models: {
          "gemini-3.1-flash-lite": {
            id: "gemini-3.1-flash-lite",
            name: "Gemini 3.1 Flash Lite",
          },
        },
      },
    ],
    default: {},
    connected,
  };
}

describe("provider-registry (discovery-based)", () => {
  beforeEach(() => {
    resetProviderRegistry();
    resetDiscovery();
  });

  describe("isQualifiedModel", () => {
    it("detects qualified models", () => {
      expect(isQualifiedModel("anthropic/claude-opus-4-6")).toBe(true);
      expect(isQualifiedModel("claude-opus-4-6")).toBe(false);
    });

    it("rejects malformed qualified models", () => {
      expect(isQualifiedModel("/gpt-5.4")).toBe(false);
      expect(isQualifiedModel("openai/")).toBe(false);
      expect(isQualifiedModel("/")).toBe(false);
    });
  });

  describe("resolveProvider", () => {
    it("resolves connected providers by priority", () => {
      initializeDiscovery(
        buildDiscoveryIndex(createProviderListResponse(["anthropic", "opencode"])),
      );

      const result = resolveProvider("claude-opus-4-6");
      expect(result).toEqual({
        qualifiedModel: "anthropic/claude-opus-4-6",
        providerId: "anthropic",
      });
    });

    it("uses preferred provider override when available", () => {
      initializeDiscovery(
        buildDiscoveryIndex(createProviderListResponse(["anthropic", "opencode"])),
      );

      const result = resolveProvider("claude-opus-4-6", "opencode");
      expect(result).toEqual({
        qualifiedModel: "opencode/claude-opus-4-6",
        providerId: "opencode",
      });
    });

    it("ignores disconnected higher-priority providers", () => {
      initializeDiscovery(buildDiscoveryIndex(createProviderListResponse(["opencode"])));

      const result = resolveProvider("claude-opus-4-6");
      expect(result).toEqual({
        qualifiedModel: "opencode/claude-opus-4-6",
        providerId: "opencode",
      });
    });

    it("passes through already-qualified models", () => {
      const result = resolveProvider("OpenAI/GPT-5.4");
      expect(result).toEqual({
        qualifiedModel: "openai/gpt-5.4",
        providerId: "openai",
      });
    });

    it("synthesizes qualification using default preferred provider when discovery is unavailable", () => {
      setDefaultPreferredProvider("opencode");
      const result = resolveProvider("claude-opus-4-6");
      expect(result).toEqual({
        qualifiedModel: "opencode/claude-opus-4-6",
        providerId: "opencode",
      });
    });

    it("synthesizes qualification using explicit preferred provider when discovery is unavailable", () => {
      const result = resolveProvider("claude-opus-4-6", "anthropic");
      expect(result).toEqual({
        qualifiedModel: "anthropic/claude-opus-4-6",
        providerId: "anthropic",
      });
    });

    it("infers provider from model name when discovery is unavailable and no preferred provider", () => {
      const claudeResult = resolveProvider("claude-opus-4-6");
      expect(claudeResult).toEqual({
        qualifiedModel: "anthropic/claude-opus-4-6",
        providerId: "anthropic",
      });

      const gptResult = resolveProvider("gpt-5.4");
      expect(gptResult).toEqual({
        qualifiedModel: "openai/gpt-5.4",
        providerId: "openai",
      });

      const geminiResult = resolveProvider("gemini-3.1-flash-lite");
      expect(geminiResult).toEqual({
        qualifiedModel: "google/gemini-3.1-flash-lite",
        providerId: "google",
      });
    });

    it("returns undefined for unknown bare models when discovery is unavailable and no preferred provider", () => {
      expect(resolveProvider("some-unknown-model")).toBeUndefined();
    });

    it("rejects malformed qualified models like /gpt-5.4", () => {
      const result = resolveProvider("/gpt-5.4");
      expect(result).toBeUndefined();
    });
  });

  describe("inferProviderFromModelName", () => {
    it("infers anthropic for claude models", () => {
      expect(inferProviderFromModelName("claude-opus-4-6")).toBe("anthropic");
      expect(inferProviderFromModelName("claude-sonnet-4-6")).toBe("anthropic");
    });

    it("infers openai for gpt models", () => {
      expect(inferProviderFromModelName("gpt-5.4")).toBe("openai");
      expect(inferProviderFromModelName("gpt-5.3-codex")).toBe("openai");
    });

    it("infers openai for o-series models", () => {
      expect(inferProviderFromModelName("o1-mini")).toBe("openai");
      expect(inferProviderFromModelName("o3-mini")).toBe("openai");
      expect(inferProviderFromModelName("o4-mini")).toBe("openai");
    });

    it("infers google for gemini models", () => {
      expect(inferProviderFromModelName("gemini-3.1-flash-lite")).toBe("google");
      expect(inferProviderFromModelName("gemini-3.1-pro-preview")).toBe("google");
    });

    it("returns undefined for unrecognized models", () => {
      expect(inferProviderFromModelName("some-unknown-model")).toBeUndefined();
    });

    it("is case-insensitive", () => {
      expect(inferProviderFromModelName("Claude-Opus-4-6")).toBe("anthropic");
      expect(inferProviderFromModelName("GPT-5.4")).toBe("openai");
    });
  });

  describe("qualifyModel", () => {
    it("qualifies when discovery is available", () => {
      initializeDiscovery(buildDiscoveryIndex(createProviderListResponse(["openai", "opencode"])));

      expect(qualifyModel("gpt-5.4")).toBe("openai/gpt-5.4");
    });

    it("infers provider from model name when discovery is unavailable", () => {
      expect(qualifyModel("claude-opus-4-6")).toBe("anthropic/claude-opus-4-6");
      expect(qualifyModel("gpt-5.4")).toBe("openai/gpt-5.4");
      expect(qualifyModel("gemini-3.1-flash-lite")).toBe("google/gemini-3.1-flash-lite");
    });

    it("falls back to pass-through for unknown models when discovery is unavailable", () => {
      expect(qualifyModel("some-unknown-model")).toBe("some-unknown-model");
    });
  });

  describe("provider priority", () => {
    it("supports setProviderPriority and getProviderPriority", () => {
      setProviderPriority(["opencode", "openai", "anthropic", "google"]);

      expect(getProviderPriority()).toEqual(["opencode", "openai", "anthropic", "google"]);
    });

    it("applies priority ordering when multiple connected providers exist", () => {
      initializeDiscovery(buildDiscoveryIndex(createProviderListResponse(["openai", "opencode"])));
      setProviderPriority(["opencode", "openai", "anthropic", "google"]);

      const result = resolveProvider("gpt-5.4");
      expect(result?.providerId).toBe("opencode");
    });
  });

  describe("gateway model maps", () => {
    it("translates canonical model IDs for selected provider", () => {
      initializeDiscovery(buildDiscoveryIndex(createProviderListResponse(["opencode"])));
      registerProviderModelMap("opencode", {
        "gemini-3.1-flash-lite": "google/gemini-3.1-flash-lite",
      });

      const result = resolveProvider("gemini-3.1-flash-lite");
      expect(result).toEqual({
        qualifiedModel: "opencode/google/gemini-3.1-flash-lite",
        providerId: "opencode",
      });
    });
  });

  describe("findProvidersForModel", () => {
    it("returns only connected providers that offer the model", () => {
      initializeDiscovery(buildDiscoveryIndex(createProviderListResponse(["openai", "opencode"])));
      const providers = findProvidersForModel("gpt-5.4");

      expect(providers).toEqual([
        { providerId: "openai", modelId: "gpt-5.4" },
        { providerId: "opencode", modelId: "gpt-5.4" },
      ]);
    });
  });
});
