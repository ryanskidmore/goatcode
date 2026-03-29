import { describe, expect, it, mock } from "bun:test";
import { createRuntimeFallbackHandler } from "./handler";

describe("createRuntimeFallbackHandler", () => {
  describe("#given a handler with a fallback chain", () => {
    describe("#when error message contains 'model not found'", () => {
      it("#then switches to a compatible same-provider fallback", async () => {
        const setCurrentModel = mock((_sid: string, _model: string) => {});

        const handler = createRuntimeFallbackHandler({
          setCurrentModel,
        });

        await handler({
          event: {
            type: "session.error",
            properties: {
              sessionID: "ses-notfound",
              model: "openai/gpt-5",
              error: { message: "Model not found for this provider" },
              fallbackChain: [
                "anthropic/claude-3.7-sonnet",
                "openai/gpt-4.1-mini",
                "google/gemini-2.5-pro",
              ],
            },
          },
        });

        expect(setCurrentModel).toHaveBeenCalledTimes(1);
        expect(setCurrentModel).toHaveBeenCalledWith("ses-notfound", "openai/gpt-4.1-mini");
      });
    });

    describe("#when error message contains 'context length'", () => {
      it("#then triggers fallback for context-exceeded reason", async () => {
        const setCurrentModel = mock((_sid: string, _model: string) => {});
        const onFallbackApplied = mock(() => {});

        const handler = createRuntimeFallbackHandler({
          setCurrentModel,
          onFallbackApplied,
        });

        await handler({
          event: {
            type: "session.error",
            properties: {
              sessionID: "ses-ctx",
              model: "anthropic/claude-3-5-sonnet",
              error: { message: "Maximum context length exceeded" },
              fallbackChain: [
                "anthropic/claude-3-5-sonnet",
                "anthropic/claude-3-5-haiku",
                "openai/gpt-4o",
              ],
            },
          },
        });

        expect(setCurrentModel).toHaveBeenCalledTimes(1);
        expect(setCurrentModel).toHaveBeenCalledWith("ses-ctx", "anthropic/claude-3-5-haiku");
        expect(onFallbackApplied).toHaveBeenCalledTimes(1);
      });
    });

    describe("#when error message is a generic error", () => {
      it("#then does not trigger any fallback", async () => {
        const setCurrentModel = mock((_sid: string, _model: string) => {});

        const handler = createRuntimeFallbackHandler({
          setCurrentModel,
        });

        await handler({
          event: {
            type: "session.error",
            properties: {
              sessionID: "ses-generic",
              model: "openai/gpt-4o",
              error: { message: "Something went wrong" },
              fallbackChain: ["openai/gpt-4o", "anthropic/claude-3-5-sonnet"],
            },
          },
        });

        expect(setCurrentModel).not.toHaveBeenCalled();
      });
    });
  });

  describe("#given a handler receives non-error events", () => {
    describe("#when event type is not session.error", () => {
      it("#then does nothing", async () => {
        const setCurrentModel = mock((_sid: string, _model: string) => {});

        const handler = createRuntimeFallbackHandler({
          setCurrentModel,
        });

        await handler({
          event: {
            type: "session.created",
            properties: {
              sessionID: "ses-created",
              model: "openai/gpt-4o",
            },
          },
        });

        expect(setCurrentModel).not.toHaveBeenCalled();
      });
    });
  });

  describe("#given a handler with 'too many tokens' error", () => {
    describe("#when error message contains 'too many tokens'", () => {
      it("#then classifies as context-exceeded and triggers fallback", async () => {
        const setCurrentModel = mock((_sid: string, _model: string) => {});

        const handler = createRuntimeFallbackHandler({
          setCurrentModel,
        });

        await handler({
          event: {
            type: "session.error",
            properties: {
              sessionID: "ses-tokens",
              model: "openai/gpt-4o",
              error: { message: "Too many tokens in the request" },
              fallbackChain: ["openai/gpt-4o", "openai/gpt-4o-mini"],
            },
          },
        });

        expect(setCurrentModel).toHaveBeenCalledTimes(1);
        expect(setCurrentModel).toHaveBeenCalledWith("ses-tokens", "openai/gpt-4o-mini");
      });
    });
  });
});
