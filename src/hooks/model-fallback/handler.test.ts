import { describe, expect, it, mock } from "bun:test";
import { createModelFallbackHandler } from "./handler";

describe("createModelFallbackHandler", () => {
  describe("#given a handler with a fallback chain", () => {
    describe("#when a rate limit error (429) occurs", () => {
      it("#then switches to the next model in the chain", async () => {
        const setCurrentModel = mock((_sid: string, _model: string) => {});
        const onFallbackApplied = mock(() => {});

        const handler = createModelFallbackHandler({
          setCurrentModel,
          onFallbackApplied,
        });

        await handler({
          event: {
            type: "session.error",
            properties: {
              sessionID: "ses-rate",
              model: "anthropic/claude-3-5-sonnet",
              error: { statusCode: 429, message: "Rate limit exceeded" },
              fallbackChain: [
                "anthropic/claude-3-5-sonnet",
                "openai/gpt-4o",
                "google/gemini-2.5-pro",
              ],
            },
          },
        });

        expect(setCurrentModel).toHaveBeenCalledTimes(1);
        expect(setCurrentModel).toHaveBeenCalledWith("ses-rate", "openai/gpt-4o");
        expect(onFallbackApplied).toHaveBeenCalledTimes(1);
      });
    });

    describe("#when a service unavailable error (503) occurs", () => {
      it("#then switches to the next model in the chain", async () => {
        const setCurrentModel = mock((_sid: string, _model: string) => {});

        const handler = createModelFallbackHandler({
          setCurrentModel,
        });

        await handler({
          event: {
            type: "session.error",
            properties: {
              sessionID: "ses-503",
              model: "openai/gpt-4o",
              error: { statusCode: 503, message: "Service unavailable" },
              fallbackChain: ["openai/gpt-4o", "anthropic/claude-3-5-sonnet"],
            },
          },
        });

        expect(setCurrentModel).toHaveBeenCalledTimes(1);
        expect(setCurrentModel).toHaveBeenCalledWith("ses-503", "anthropic/claude-3-5-sonnet");
      });
    });

    describe("#when a non-matching error (400) occurs", () => {
      it("#then does not trigger a fallback", async () => {
        const setCurrentModel = mock((_sid: string, _model: string) => {});

        const handler = createModelFallbackHandler({
          setCurrentModel,
        });

        await handler({
          event: {
            type: "session.error",
            properties: {
              sessionID: "ses-400",
              model: "openai/gpt-4o",
              error: { statusCode: 400, message: "Bad request" },
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

        const handler = createModelFallbackHandler({
          setCurrentModel,
        });

        await handler({
          event: {
            type: "session.idle",
            properties: {
              sessionID: "ses-idle",
              model: "openai/gpt-4o",
            },
          },
        });

        expect(setCurrentModel).not.toHaveBeenCalled();
      });
    });
  });

  describe("#given a handler receives an error with no model info", () => {
    describe("#when the event has no model property and no getCurrentModel", () => {
      it("#then does nothing", async () => {
        const setCurrentModel = mock((_sid: string, _model: string) => {});

        const handler = createModelFallbackHandler({
          setCurrentModel,
        });

        await handler({
          event: {
            type: "session.error",
            properties: {
              sessionID: "ses-nomodel",
              error: { statusCode: 429, message: "Too many requests" },
              fallbackChain: ["openai/gpt-4o", "anthropic/claude-3-5-sonnet"],
            },
          },
        });

        expect(setCurrentModel).not.toHaveBeenCalled();
      });
    });
  });

  describe("#given a handler with rate limit message detection", () => {
    describe("#when error message contains 'too many requests' without statusCode", () => {
      it("#then triggers fallback via message classification", async () => {
        const setCurrentModel = mock((_sid: string, _model: string) => {});

        const handler = createModelFallbackHandler({
          setCurrentModel,
        });

        await handler({
          event: {
            type: "session.error",
            properties: {
              sessionID: "ses-msg",
              model: "openai/gpt-4o",
              error: { message: "Too many requests, please slow down" },
              fallbackChain: ["openai/gpt-4o", "anthropic/claude-3-5-sonnet"],
            },
          },
        });

        expect(setCurrentModel).toHaveBeenCalledTimes(1);
        expect(setCurrentModel).toHaveBeenCalledWith("ses-msg", "anthropic/claude-3-5-sonnet");
      });
    });
  });
});
