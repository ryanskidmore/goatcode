import { describe, expect, it } from "bun:test";

import {
  createContextWindowLimitHandler,
  CONTEXT_WINDOW_LIMIT_RECOVERY_MESSAGE,
} from "./handler";

type UnknownHandler = (input: unknown) => Promise<void>;

describe("createContextWindowLimitHandler", () => {
  describe("#given a handler instance", () => {
    const handler = createContextWindowLimitHandler() as unknown as UnknownHandler;

    describe("#when event is session.error with token limit error", () => {
      it("#then sets recoveryActions and recoveryContext", async () => {
        const properties: Record<string, unknown> = { error: "token limit exceeded" };
        const input = {
          event: { type: "session.error", properties },
        };
        await handler(input);
        expect(properties.recoveryActions).toEqual(["compact", "summarize"]);
        expect(properties.recoveryContext).toBe(CONTEXT_WINDOW_LIMIT_RECOVERY_MESSAGE);
      });
    });

    describe("#when event is session.error with 'context window' error", () => {
      it("#then sets recoveryActions and recoveryContext", async () => {
        const properties: Record<string, unknown> = { error: "context window exceeded" };
        const input = {
          event: { type: "session.error", properties },
        };
        await handler(input);
        expect(properties.recoveryActions).toEqual(["compact", "summarize"]);
        expect(properties.recoveryContext).toContain("[CONTEXT WINDOW LIMIT RECOVERY]");
      });
    });

    describe("#when event is session.idle with contextWindowUsage >= 0.9", () => {
      it("#then sets recoveryActions and recoveryContext", async () => {
        const properties: Record<string, unknown> = { contextWindowUsage: 0.95 };
        const input = {
          event: { type: "session.idle", properties },
        };
        await handler(input);
        expect(properties.recoveryActions).toEqual(["compact", "summarize"]);
        expect(properties.recoveryContext).toBe(CONTEXT_WINDOW_LIMIT_RECOVERY_MESSAGE);
      });
    });

    describe("#when event is session.idle with contextWindowUsage below threshold", () => {
      it("#then no-op", async () => {
        const properties: Record<string, unknown> = { contextWindowUsage: 0.5 };
        const input = {
          event: { type: "session.idle", properties },
        };
        await handler(input);
        expect(properties.recoveryActions).toBeUndefined();
        expect(properties.recoveryContext).toBeUndefined();
      });
    });

    describe("#when event type is session.created (non-matching)", () => {
      it("#then no-op", async () => {
        const properties: Record<string, unknown> = { error: "context window exceeded" };
        const input = {
          event: { type: "session.created", properties },
        };
        await handler(input);
        expect(properties.recoveryActions).toBeUndefined();
        expect(properties.recoveryContext).toBeUndefined();
      });
    });

    describe("#when recoveryContext already contains the marker", () => {
      it("#then does not double-append recoveryContext", async () => {
        const properties: Record<string, unknown> = {
          error: "token limit exceeded",
          recoveryContext: CONTEXT_WINDOW_LIMIT_RECOVERY_MESSAGE,
        };
        const input = {
          event: { type: "session.error", properties },
        };
        await handler(input);
        expect(properties.recoveryContext).toBe(CONTEXT_WINDOW_LIMIT_RECOVERY_MESSAGE);
      });
    });

    describe("#when contextWindowUsage is a percentage > 1", () => {
      it("#then normalizes to ratio and triggers if >= 0.9", async () => {
        const properties: Record<string, unknown> = { contextWindowUsage: 95 };
        const input = {
          event: { type: "session.idle", properties },
        };
        await handler(input);
        expect(properties.recoveryActions).toEqual(["compact", "summarize"]);
        expect(properties.recoveryContext).toContain("[CONTEXT WINDOW LIMIT RECOVERY]");
      });
    });

    describe("#when input is not a record", () => {
      it("#then no-op", async () => {
        await handler(null);
      });
    });
  });
});
