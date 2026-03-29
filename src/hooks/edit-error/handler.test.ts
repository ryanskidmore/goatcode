import { describe, expect, it } from "bun:test";

import { createEditErrorHandler, EDIT_ERROR_RECOVERY_MESSAGE } from "./handler";

type UnknownHandler = (input: unknown, output: unknown) => Promise<void>;

describe("createEditErrorHandler", () => {
  describe("#given a handler instance", () => {
    const handler = createEditErrorHandler() as unknown as UnknownHandler;

    describe("#when input.tool is 'edit' and output contains 'oldString not found'", () => {
      it("#then appends EDIT_ERROR_RECOVERY_MESSAGE to output.output", async () => {
        const input = { tool: "edit" };
        const output = { output: "oldString not found in file" };
        await handler(input, output);
        expect(output.output).toContain("[EDIT ERROR RECOVERY]");
        expect(output.output).toBe(`oldString not found in file\n${EDIT_ERROR_RECOVERY_MESSAGE}`);
      });
    });

    describe("#when input.tool is 'edit' and output contains 'oldString found multiple times'", () => {
      it("#then appends EDIT_ERROR_RECOVERY_MESSAGE", async () => {
        const input = { tool: "edit" };
        const output = { output: "oldString found multiple times in file content" };
        await handler(input, output);
        expect(output.output).toContain("[EDIT ERROR RECOVERY]");
      });
    });

    describe("#when input.tool is not 'edit'", () => {
      it("#then output.output remains unchanged", async () => {
        const input = { tool: "bash" };
        const output = { output: "oldString not found in file" };
        await handler(input, output);
        expect(output.output).toBe("oldString not found in file");
      });
    });

    describe("#when output already contains recovery marker", () => {
      it("#then does not double-append", async () => {
        const input = { tool: "edit" };
        const output = {
          output: `oldString not found in file\n${EDIT_ERROR_RECOVERY_MESSAGE}`,
        };
        const before = output.output;
        await handler(input, output);
        expect(output.output).toBe(before);
      });
    });

    describe("#when output.output is not a string", () => {
      it("#then no-op", async () => {
        const input = { tool: "edit" };
        const output = { output: 42 };
        await handler(input, output);
        expect(output.output).toBe(42);
      });
    });

    describe("#when input or output is not a record", () => {
      it("#then no-op for non-object input", async () => {
        const output = { output: "oldString not found" };
        await handler(null, output);
        expect(output.output).toBe("oldString not found");
      });

      it("#then no-op for non-object output", async () => {
        const input = { tool: "edit" };
        await handler(input, "not-an-object");
      });
    });

    describe("#when input.tool is 'Edit' (case-insensitive)", () => {
      it("#then still triggers recovery", async () => {
        const input = { tool: "Edit" };
        const output = { output: "oldString not found in file" };
        await handler(input, output);
        expect(output.output).toContain("[EDIT ERROR RECOVERY]");
      });
    });
  });
});
