import { beforeEach, describe, expect, it } from "bun:test";
import {
  buildDiscoveryIndex,
  getDiscovery,
  initializeDiscovery,
  resetDiscovery,
  type ProviderListResponse,
} from "./provider-discovery";

function createProviderListResponse(): ProviderListResponse {
  return {
    all: [
      {
        id: "anthropic",
        name: "Anthropic",
        env: ["ANTHROPIC_API_KEY"],
        models: {
          "claude-opus-4-6": { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
          "claude-sonnet-4-6": { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
        },
      },
      {
        id: "opencode",
        name: "OpenCode",
        env: [],
        models: {
          "claude-opus-4-6": { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
          "gpt-5.4": { id: "gpt-5.4", name: "GPT 5.4" },
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
    ],
    default: {},
    connected: ["anthropic", "opencode"],
  };
}

describe("buildDiscoveryIndex", () => {
  beforeEach(() => {
    resetDiscovery();
  });

  it("builds model and provider indexes from provider list", () => {
    const result = buildDiscoveryIndex(createProviderListResponse());

    expect(result.modelIndex.get("claude-opus-4-6")).toEqual([
      { providerId: "anthropic", modelId: "claude-opus-4-6" },
      { providerId: "opencode", modelId: "claude-opus-4-6" },
    ]);
    expect(result.providerModels.get("anthropic")?.has("claude-sonnet-4-6")).toBe(true);
    expect(result.providerModels.get("openai")?.has("gpt-5.4")).toBe(true);
  });

  it("normalizes model and provider identifiers", () => {
    const base = createProviderListResponse();
    const response: ProviderListResponse = {
      ...base,
      all: [
        {
          ...base.all[0],
          id: "Anthropic",
          models: {
            "CLAUDE-OPUS-4-6": { id: "CLAUDE-OPUS-4-6", name: "Claude Opus 4.6" },
          },
        },
        base.all[1],
        base.all[2],
      ],
      connected: [" Anthropic "],
    };

    const result = buildDiscoveryIndex(response);
    expect(result.connectedProviders.has("anthropic")).toBe(true);
    expect(result.modelIndex.get("claude-opus-4-6")).toEqual([
      { providerId: "anthropic", modelId: "claude-opus-4-6" },
      { providerId: "opencode", modelId: "claude-opus-4-6" },
    ]);
  });

  it("initializes and resets cached discovery state", () => {
    const result = buildDiscoveryIndex(createProviderListResponse());
    initializeDiscovery(result);

    expect(getDiscovery()).toBeDefined();
    expect(getDiscovery()?.connectedProviders.has("anthropic")).toBe(true);

    resetDiscovery();
    expect(getDiscovery()).toBeUndefined();
  });
});
