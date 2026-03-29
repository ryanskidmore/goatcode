import { describe, expect, it } from "bun:test";

import { createToolErrorHandler, createEventErrorHandler } from "./handler";

type UnknownToolHandler = (input: unknown, output: unknown) => Promise<void>;
type UnknownEventHandler = (input: unknown) => Promise<void>;

describe("createToolErrorHandler", () => {
  describe("#given a handler instance", () => {
    const handler = createToolErrorHandler() as unknown as UnknownToolHandler;

    describe("#when output contains a known error pattern (rate limit)", () => {
      it("#then appends diagnostic with category, severity, suggestion", async () => {
        const input = {};
        const output = { output: "Error: rate limit exceeded, try again later" };
        await handler(input, output);
        expect(output.output).toContain("[ERROR DIAGNOSTIC]");
        expect(output.output).toContain("Category: rate-limit");
        expect(output.output).toContain("Severity: warning");
        expect(output.output).toContain("Suggestion:");
      });
    });

    describe("#when output contains a permission error pattern", () => {
      it("#then appends diagnostic with category permission", async () => {
        const input = {};
        const output = { output: "EACCES: permission denied, open '/etc/shadow'" };
        await handler(input, output);
        expect(output.output).toContain("[ERROR DIAGNOSTIC]");
        expect(output.output).toContain("Category: permission");
        expect(output.output).toContain("Severity: error");
      });
    });

    describe("#when output does not match any error pattern", () => {
      it("#then no-op", async () => {
        const input = {};
        const output = { output: "success: operation completed" };
        await handler(input, output);
        expect(output.output).toBe("success: operation completed");
      });
    });

    describe("#when output already contains diagnostic marker", () => {
      it("#then does not double-append", async () => {
        const input = {};
        const output = {
          output:
            "rate limit exceeded\n[ERROR DIAGNOSTIC]\nCategory: rate-limit\nSeverity: warning\nSuggestion: Wait.",
        };
        const before = output.output;
        await handler(input, output);
        expect(output.output).toBe(before);
      });
    });

    describe("#when output.output is not a string", () => {
      it("#then no-op", async () => {
        const input = {};
        const output = { output: 999 };
        await handler(input, output);
        expect(output.output).toBe(999);
      });
    });

    describe("#when output is not a record", () => {
      it("#then no-op", async () => {
        await handler({}, "not-a-record");
      });
    });
  });
});

describe("createEventErrorHandler", () => {
  describe("#given a handler instance", () => {
    const handler = createEventErrorHandler() as unknown as UnknownEventHandler;

    describe("#when event is session.error with a matching error pattern", () => {
      it("#then sets recoveryContext with diagnostic", async () => {
        const properties: Record<string, unknown> = { error: "ECONNREFUSED: connection refused" };
        const input = {
          event: { type: "session.error", properties },
        };
        await handler(input);
        expect(properties.recoveryContext).toContain("[ERROR DIAGNOSTIC]");
        expect(properties.recoveryContext).toContain("Category: network");
        expect(properties.recoveryContext).toContain("Severity: error");
      });
    });

    describe("#when event is session.error with timeout error", () => {
      it("#then sets recoveryContext with timeout diagnostic", async () => {
        const properties: Record<string, unknown> = { error: "request timed out" };
        const input = {
          event: { type: "session.error", properties },
        };
        await handler(input);
        expect(properties.recoveryContext).toContain("[ERROR DIAGNOSTIC]");
        expect(properties.recoveryContext).toContain("Category: timeout");
      });
    });

    describe("#when event type is not session.error", () => {
      it("#then no-op", async () => {
        const properties: Record<string, unknown> = { error: "ECONNREFUSED" };
        const input = {
          event: { type: "session.idle", properties },
        };
        await handler(input);
        expect(properties.recoveryContext).toBeUndefined();
      });
    });

    describe("#when event error does not match any pattern", () => {
      it("#then no recoveryContext set", async () => {
        const properties: Record<string, unknown> = { error: "something completely normal" };
        const input = {
          event: { type: "session.error", properties },
        };
        await handler(input);
        expect(properties.recoveryContext).toBeUndefined();
      });
    });

    describe("#when recoveryContext already contains diagnostic marker", () => {
      it("#then does not double-append", async () => {
        const existingDiag =
          "[ERROR DIAGNOSTIC]\nCategory: network\nSeverity: error\nSuggestion: Check.";
        const properties: Record<string, unknown> = {
          error: "ECONNREFUSED",
          recoveryContext: existingDiag,
        };
        const input = {
          event: { type: "session.error", properties },
        };
        await handler(input);
        expect(properties.recoveryContext).toBe(existingDiag);
      });
    });

    describe("#when input is not a record", () => {
      it("#then no-op", async () => {
        await handler(null);
      });
    });
  });
});
