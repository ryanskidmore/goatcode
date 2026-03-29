import { describe, expect, it } from "bun:test";

import { createJsonErrorHandler, JSON_ERROR_RECOVERY_MESSAGE } from "./handler";

type UnknownHandler = (input: unknown, output: unknown) => Promise<void>;

describe("createJsonErrorHandler", () => {
  describe("#given a handler instance", () => {
    const handler = createJsonErrorHandler() as unknown as UnknownHandler;

    describe("#when output contains a JSON error pattern", () => {
      it("#then appends JSON_ERROR_RECOVERY_MESSAGE", async () => {
        const input = {};
        const output = { output: "JSON parse error: unexpected token at position 5" };
        await handler(input, output);
        expect(output.output).toContain("[JSON ERROR RECOVERY]");
        expect(output.output).toContain("JSON parse error: unexpected token at position 5");
      });
    });

    describe("#when output looks like malformed JSON and json is expected via metadata", () => {
      it("#then appends recovery message", async () => {
        const input = {};
        const output = {
          output: '{ "key": "value", }',
          metadata: { format: "json" },
        };
        await handler(input, output);
        expect(output.output).toContain("[JSON ERROR RECOVERY]");
      });
    });

    describe("#when output is valid JSON", () => {
      it("#then output remains unchanged", async () => {
        const input = {};
        const output = {
          output: '{"key": "value"}',
          metadata: { format: "json" },
        };
        await handler(input, output);
        expect(output.output).toBe('{"key": "value"}');
      });
    });

    describe("#when output already contains recovery marker", () => {
      it("#then does not double-append", async () => {
        const input = {};
        const output = {
          output: `JSON parse error\n${JSON_ERROR_RECOVERY_MESSAGE}`,
        };
        const before = output.output;
        await handler(input, output);
        expect(output.output).toBe(before);
      });
    });

    describe("#when output.output is not a string", () => {
      it("#then no-op", async () => {
        const input = {};
        const output = { output: 123 };
        await handler(input, output);
        expect(output.output).toBe(123);
      });
    });

    describe("#when output is not a record", () => {
      it("#then no-op", async () => {
        await handler({}, "not-an-object");
      });
    });

    describe("#when output looks like JSON but json is NOT expected", () => {
      it("#then no recovery (no error pattern, no json expectation)", async () => {
        const input = {};
        const output = { output: '{ "key": "value", }' };
        await handler(input, output);
        expect(output.output).toBe('{ "key": "value", }');
      });
    });

    describe("#when output matches via title containing 'json'", () => {
      it("#then appends recovery for malformed json", async () => {
        const input = {};
        const output = {
          output: "[ invalid json array",
          title: "JSON Response",
        };
        await handler(input, output);
        expect(output.output).toContain("[JSON ERROR RECOVERY]");
      });
    });
  });
});
