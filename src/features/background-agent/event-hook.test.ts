import { describe, expect, it } from "bun:test";
import { extractMessageUpdatedMetadata, extractSessionErrorMetadata } from "./event-hook";

describe("background-agent event metadata extraction", () => {
  describe("#extractSessionErrorMetadata", () => {
    it("#then extracts direct session.error fields", () => {
      const metadata = extractSessionErrorMetadata({
        error: { message: "quota exceeded", statusCode: 429 },
        model: "openai/gpt-5.3-codex",
        retryRequested: true,
        retryWithModel: "anthropic/claude-opus-4-6",
      });

      expect(metadata.error).toEqual({ message: "quota exceeded", statusCode: 429 });
      expect(metadata.model).toBe("openai/gpt-5.3-codex");
      expect(metadata.retryRequested).toBe(true);
      expect(metadata.retryWithModel).toBe("anthropic/claude-opus-4-6");
    });
  });

  describe("#extractMessageUpdatedMetadata", () => {
    it("#then derives model from providerID/modelID in message.updated info", () => {
      const metadata = extractMessageUpdatedMetadata({
        info: {
          role: "assistant",
          providerID: "openai",
          modelID: "gpt-5.3-codex",
          error: { message: "insufficient quota", statusCode: 429 },
        },
      });

      expect(metadata.error).toEqual({ message: "insufficient quota", statusCode: 429 });
      expect(metadata.model).toBe("openai/gpt-5.3-codex");
    });

    it("#then prefers explicit properties.model when present", () => {
      const metadata = extractMessageUpdatedMetadata({
        model: "anthropic/claude-opus-4-6",
        info: {
          role: "assistant",
          providerID: "openai",
          modelID: "gpt-5.3-codex",
          error: { message: "rate limit" },
        },
      });

      expect(metadata.model).toBe("anthropic/claude-opus-4-6");
    });

    it("#then supports session.status retry-style payload metadata extraction", () => {
      const metadata = extractMessageUpdatedMetadata({
        model: "openai/gpt-5.3-codex",
        retryRequested: true,
        retryWithModel: "anthropic/claude-opus-4-6",
        info: {
          role: "assistant",
          error: { message: "Rate Limited" },
        },
      });

      expect(metadata.model).toBe("openai/gpt-5.3-codex");
      expect(metadata.retryRequested).toBe(true);
      expect(metadata.retryWithModel).toBe("anthropic/claude-opus-4-6");
    });
  });
});
