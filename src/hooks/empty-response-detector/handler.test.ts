import { describe, expect, it } from "bun:test";

import { createEmptyResponseDetectorHandler, EMPTY_RESPONSE_WARNING } from "./handler";

describe("createEmptyResponseDetectorHandler", () => {
  describe("#given a task tool with empty output", () => {
    describe("#when the output string is empty", () => {
      it("#then replaces output with the warning message", async () => {
        const handler = createEmptyResponseDetectorHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const output = { title: "task", output: "", metadata: {} };

        await handler(input, output);

        expect(output.output).toBe(EMPTY_RESPONSE_WARNING);
      });
    });
  });

  describe("#given a task tool with near-empty output", () => {
    describe("#when the output is under the threshold length", () => {
      it("#then replaces output with the warning message", async () => {
        const handler = createEmptyResponseDetectorHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const output = { title: "task", output: "short", metadata: {} };

        await handler(input, output);

        expect(output.output).toBe(EMPTY_RESPONSE_WARNING);
      });
    });
  });

  describe("#given a task tool with whitespace-only output", () => {
    describe("#when the output is tabs and spaces", () => {
      it("#then replaces output with the warning message", async () => {
        const handler = createEmptyResponseDetectorHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const output = { title: "task", output: "  \t\t  ", metadata: {} };

        await handler(input, output);

        expect(output.output).toBe(EMPTY_RESPONSE_WARNING);
      });
    });
  });

  describe("#given a task tool with null output", () => {
    describe("#when output.output is null", () => {
      it("#then sets output to the warning message", async () => {
        const handler = createEmptyResponseDetectorHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const output = { title: "task", output: null as unknown as string, metadata: {} };

        await handler(input, output);

        expect(output.output).toBe(EMPTY_RESPONSE_WARNING);
      });
    });
  });

  describe("#given a task tool with undefined output", () => {
    describe("#when output.output is undefined", () => {
      it("#then sets output to the warning message", async () => {
        const handler = createEmptyResponseDetectorHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const output = { title: "task", output: undefined as unknown as string, metadata: {} };

        await handler(input, output);

        expect(output.output).toBe(EMPTY_RESPONSE_WARNING);
      });
    });
  });

  describe("#given a task tool with meaningful content", () => {
    describe("#when the output has substantial text", () => {
      it("#then does not modify the output", async () => {
        const handler = createEmptyResponseDetectorHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const original = "The agent completed all requested changes to the codebase.";
        const output = { title: "task", output: original, metadata: {} };

        await handler(input, output);

        expect(output.output).toBe(original);
      });
    });
  });

  describe("#given a task tool with output already containing the marker", () => {
    describe("#when the output has EMPTY_RESPONSE_WARNING already", () => {
      it("#then does not double-inject the warning", async () => {
        const handler = createEmptyResponseDetectorHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const output = { title: "task", output: EMPTY_RESPONSE_WARNING, metadata: {} };

        await handler(input, output);

        expect(output.output).toBe(EMPTY_RESPONSE_WARNING);
      });
    });
  });

  describe("#given a non-task tool", () => {
    describe("#when the tool is Bash with empty output", () => {
      it("#then does not modify the output", async () => {
        const handler = createEmptyResponseDetectorHandler();
        const input = { tool: "Bash", sessionID: "s1", callID: "c1", args: {} };
        const output = { title: "Bash", output: "", metadata: {} };

        await handler(input, output);

        expect(output.output).toBe("");
      });
    });
  });

  describe("#given a task tool with output exactly at threshold boundary", () => {
    describe("#when the trimmed output is exactly 10 characters", () => {
      it("#then does not replace the output", async () => {
        const handler = createEmptyResponseDetectorHandler();
        const input = { tool: "task", sessionID: "s1", callID: "c1", args: {} };
        const original = "1234567890";
        const output = { title: "task", output: original, metadata: {} };

        await handler(input, output);

        expect(output.output).toBe(original);
      });
    });
  });
});
