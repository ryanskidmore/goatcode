import { describe, expect, it, mock } from "bun:test";
import { createForegroundFallbackHandler } from "./handler";

type GenericHook = (input: unknown) => Promise<void>;

describe("createForegroundFallbackHandler", () => {
  describe("#given a handler with a fallback chain", () => {
    describe("#when a rate-limit error (429) occurs on session.error", () => {
      it("#then switches to the next model and sets retry properties", async () => {
        const setCurrentModel = mock((_sid: string, _model: string) => {});
        const onFallbackApplied = mock(() => {});
        const onRetryRequested = mock(() => {});

        const handler = createForegroundFallbackHandler({
          setCurrentModel,
          onFallbackApplied,
          onRetryRequested,
        }) as unknown as GenericHook;

        const properties: Record<string, unknown> = {
          sessionID: "ses-fg-429",
          model: "anthropic/claude-3-5-sonnet",
          error: { statusCode: 429, message: "Rate limit exceeded" },
          fallbackChain: [
            "anthropic/claude-3-5-sonnet",
            "openai/gpt-4o",
            "google/gemini-2.5-pro",
          ],
        };
        await handler({
          event: {
            type: "session.error",
            properties,
          },
        });

        expect(setCurrentModel).toHaveBeenCalledTimes(1);
        expect(setCurrentModel).toHaveBeenCalledWith("ses-fg-429", "openai/gpt-4o");
        expect(properties.retryRequested).toBe(true);
        expect(properties.retryWithModel).toBe("openai/gpt-4o");
        expect(onFallbackApplied).toHaveBeenCalledTimes(1);
        expect(onRetryRequested).toHaveBeenCalledTimes(1);
      });
    });

    describe("#when a 'too many requests' message triggers on session.error", () => {
      it("#then detects rate-limit via message pattern matching", async () => {
        const setCurrentModel = mock((_sid: string, _model: string) => {});

        const handler = createForegroundFallbackHandler({
          setCurrentModel,
        }) as unknown as GenericHook;

        await handler({
          event: {
            type: "session.error",
            properties: {
              sessionID: "ses-fg-msg",
              model: "openai/gpt-4o",
              error: { message: "Too many requests, please slow down" },
              fallbackChain: ["openai/gpt-4o", "anthropic/claude-3-5-sonnet"],
            },
          },
        });

        expect(setCurrentModel).toHaveBeenCalledTimes(1);
        expect(setCurrentModel).toHaveBeenCalledWith("ses-fg-msg", "anthropic/claude-3-5-sonnet");
      });
    });

    describe("#when error message contains 'quota exceeded'", () => {
      it("#then also recognizes as rate-limit error", async () => {
        const setCurrentModel = mock((_sid: string, _model: string) => {});

        const handler = createForegroundFallbackHandler({
          setCurrentModel,
        }) as unknown as GenericHook;

        await handler({
          event: {
            type: "session.error",
            properties: {
              sessionID: "ses-fg-quota",
              model: "openai/gpt-4o",
              error: { message: "Quota exceeded for this billing period" },
              fallbackChain: ["openai/gpt-4o", "google/gemini-2.5-pro"],
            },
          },
        });

        expect(setCurrentModel).toHaveBeenCalledTimes(1);
        expect(setCurrentModel).toHaveBeenCalledWith("ses-fg-quota", "google/gemini-2.5-pro");
      });
    });
  });

  describe("#given a non-rate-limit error", () => {
    describe("#when a 400 Bad Request occurs", () => {
      it("#then does not trigger fallback", async () => {
        const setCurrentModel = mock((_sid: string, _model: string) => {});

        const handler = createForegroundFallbackHandler({
          setCurrentModel,
        }) as unknown as GenericHook;

        await handler({
          event: {
            type: "session.error",
            properties: {
              sessionID: "ses-fg-400",
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

  describe("#given a non-error event type", () => {
    describe("#when event type is session.idle", () => {
      it("#then does nothing", async () => {
        const setCurrentModel = mock((_sid: string, _model: string) => {});

        const handler = createForegroundFallbackHandler({
          setCurrentModel,
        }) as unknown as GenericHook;

        await handler({
          event: {
            type: "session.idle",
            properties: {
              sessionID: "ses-fg-idle",
              model: "openai/gpt-4o",
            },
          },
        });

        expect(setCurrentModel).not.toHaveBeenCalled();
      });
    });
  });

  describe("#given a rate-limit on message.updated event", () => {
    describe("#when info.error contains a rate-limit error", () => {
      it("#then triggers fallback via message.updated path", async () => {
        const setCurrentModel = mock((_sid: string, _model: string) => {});

        const handler = createForegroundFallbackHandler({
          setCurrentModel,
        }) as unknown as GenericHook;

        await handler({
          event: {
            type: "message.updated",
            properties: {
              sessionID: "ses-fg-msgupdated",
              model: "anthropic/claude-3-5-sonnet",
              info: {
                error: { statusCode: 429, message: "Rate limit" },
              },
              fallbackChain: ["anthropic/claude-3-5-sonnet", "openai/gpt-4o"],
            },
          },
        });

        expect(setCurrentModel).toHaveBeenCalledTimes(1);
        expect(setCurrentModel).toHaveBeenCalledWith("ses-fg-msgupdated", "openai/gpt-4o");
      });
    });
  });

  describe("#given no session ID in the event", () => {
    describe("#when properties lack sessionID and info.id", () => {
      it("#then does nothing", async () => {
        const setCurrentModel = mock((_sid: string, _model: string) => {});

        const handler = createForegroundFallbackHandler({
          setCurrentModel,
        }) as unknown as GenericHook;

        await handler({
          event: {
            type: "session.error",
            properties: {
              model: "openai/gpt-4o",
              error: { statusCode: 429, message: "Rate limit" },
              fallbackChain: ["openai/gpt-4o", "anthropic/claude-3-5-sonnet"],
            },
          },
        });

        expect(setCurrentModel).not.toHaveBeenCalled();
      });
    });
  });

  describe("#given deduplication window", () => {
    describe("#when the same rate-limit fires twice within 5 seconds", () => {
      it("#then only triggers fallback once", async () => {
        let currentTime = 1000000;
        const setCurrentModel = mock((_sid: string, _model: string) => {});

        const handler = createForegroundFallbackHandler({
          setCurrentModel,
          now: () => currentTime,
        }) as unknown as GenericHook;

        const makeEvent = () => ({
          event: {
            type: "session.error",
            properties: {
              sessionID: "ses-fg-dedup",
              model: "anthropic/claude-3-5-sonnet",
              error: { statusCode: 429, message: "Rate limit" },
              fallbackChain: ["anthropic/claude-3-5-sonnet", "openai/gpt-4o"],
            },
          },
        });

        await handler(makeEvent());
        expect(setCurrentModel).toHaveBeenCalledTimes(1);

        currentTime += 2000;
        await handler(makeEvent());
        expect(setCurrentModel).toHaveBeenCalledTimes(1);
      });
    });
  });
});
