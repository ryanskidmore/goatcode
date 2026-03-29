import { describe, expect, it } from "bun:test";

import { createSessionRecoveryHandler, SESSION_RECOVERY_MESSAGE } from "./handler";

type UnknownHandler = (input: unknown) => Promise<void>;

describe("createSessionRecoveryHandler", () => {
  describe("#given a handler instance", () => {
    const handler = createSessionRecoveryHandler() as unknown as UnknownHandler;

    describe("#when event is session.error with a matching recovery pattern", () => {
      it("#then sets recoveryContext on properties", async () => {
        const properties: Record<string, unknown> = { error: "session crash detected" };
        const input = {
          event: { type: "session.error", properties },
        };
        await handler(input);
        expect(properties.recoveryContext).toBe(SESSION_RECOVERY_MESSAGE);
      });
    });

    describe("#when event is session.error with 'connection reset'", () => {
      it("#then sets recoveryContext", async () => {
        const properties: Record<string, unknown> = { error: "connection reset by peer" };
        const input = {
          event: { type: "session.error", properties },
        };
        await handler(input);
        expect(properties.recoveryContext).toContain("[SESSION RECOVERY]");
      });
    });

    describe("#when event is session.error but error does not match patterns", () => {
      it("#then no recoveryContext is added", async () => {
        const properties: Record<string, unknown> = { error: "unknown error happened" };
        const input = {
          event: { type: "session.error", properties },
        };
        await handler(input);
        expect(properties.recoveryContext).toBeUndefined();
      });
    });

    describe("#when event type is not session.error", () => {
      it("#then no-op", async () => {
        const properties: Record<string, unknown> = { error: "session crash detected" };
        const input = {
          event: { type: "session.idle", properties },
        };
        await handler(input);
        expect(properties.recoveryContext).toBeUndefined();
      });
    });

    describe("#when recoveryContext already contains the marker", () => {
      it("#then does not double-append", async () => {
        const properties: Record<string, unknown> = {
          error: "session crash detected",
          recoveryContext: SESSION_RECOVERY_MESSAGE,
        };
        const input = {
          event: { type: "session.error", properties },
        };
        await handler(input);
        expect(properties.recoveryContext).toBe(SESSION_RECOVERY_MESSAGE);
      });
    });

    describe("#when input is not a record", () => {
      it("#then no-op", async () => {
        await handler(null);
      });
    });

    describe("#when error is an object with message property", () => {
      it("#then extracts message for pattern matching", async () => {
        const properties: Record<string, unknown> = {
          error: { message: "socket hang up" },
        };
        const input = {
          event: { type: "session.error", properties },
        };
        await handler(input);
        expect(properties.recoveryContext).toContain("[SESSION RECOVERY]");
      });
    });
  });
});
