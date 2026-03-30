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
  isQualifiedModel,
  qualifyModel,
  registerProviderModelMap,
  resetProviderRegistry,
  resolveProvider,
  setDefaultPreferredProvider,
  setProviderPriority,
  unregisterProviderModelMap,
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

    it("returns undefined for bare models when discovery is unavailable and no preferred provider", () => {
      expect(resolveProvider("claude-opus-4-6")).toBeUndefined();
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

    it("rejects malformed qualified models like /gpt-5.4", () => {
      const result = resolveProvider("/gpt-5.4");
      expect(result).toBeUndefined();
    });
  });

  describe("qualifyModel", () => {
    it("qualifies when discovery is available", () => {
      initializeDiscovery(buildDiscoveryIndex(createProviderListResponse(["openai", "opencode"])));

      expect(qualifyModel("gpt-5.4")).toBe("openai/gpt-5.4");
    });

    it("falls back to pass-through when discovery is unavailable", () => {
      expect(qualifyModel("gpt-5.4")).toBe("gpt-5.4");
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
