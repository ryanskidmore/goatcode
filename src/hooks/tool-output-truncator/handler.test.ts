import { describe, it, expect } from "bun:test";
import { createToolOutputTruncatorHandler } from "./handler";

describe("createToolOutputTruncatorHandler", () => {
  describe("#given a truncatable tool with output exceeding 2000 lines", () => {
    describe("#when the handler processes the output", () => {
      it("#then truncates the output and appends a truncation notice", async () => {
        const handler = createToolOutputTruncatorHandler();
        const lines = Array.from({ length: 3000 }, (_, i) => `line ${i + 1}: some content`);
        const input = { tool: "grep", sessionID: "s1", callID: "c1", args: {} };
        const output = {
          title: "grep result",
          output: lines.join("\n"),
          metadata: {},
        };

        await handler(input, output);

        const resultLines = output.output.split("\n");
        expect(resultLines.length).toBeLessThan(3000);
        expect(output.output).toContain("[Output truncated:");
        expect(output.output).toContain("Full output written to");
        expect(output.output).toContain("Use Read with offset/limit");
      });
    });
  });

  describe("#given a truncatable tool with output exceeding 51200 bytes via many lines", () => {
    describe("#when the handler processes the output", () => {
      it("#then truncates and appends a notice with byte count", async () => {
        const handler = createToolOutputTruncatorHandler();
        const lines = Array.from({ length: 2500 }, (_, i) => `${i}: ${"y".repeat(50)}`);
        const bigOutput = lines.join("\n");
        expect(Buffer.byteLength(bigOutput, "utf8")).toBeGreaterThan(51_200);
        expect(lines.length).toBeGreaterThan(2_000);

        const input = { tool: "bash", sessionID: "s1", callID: "c1", args: {} };
        const output = {
          title: "bash result",
          output: bigOutput,
          metadata: {},
        };

        await handler(input, output);

        expect(output.output).toContain("[Output truncated:");
        expect(output.output).toContain("bytes exceeded limit");
        const resultLines = output.output.split("\n");
        expect(resultLines.length).toBeLessThan(2500);
      });
    });
  });

  describe("#given a truncatable tool with output under the threshold", () => {
    describe("#when the handler processes the output", () => {
      it("#then leaves the output unchanged", async () => {
        const handler = createToolOutputTruncatorHandler();
        const original = "short output";
        const input = { tool: "bash", sessionID: "s1", callID: "c1", args: {} };
        const output = {
          title: "bash result",
          output: original,
          metadata: {},
        };

        await handler(input, output);

        expect(output.output).toBe(original);
      });
    });
  });

  describe("#given non-string output", () => {
    describe("#when the handler processes the output", () => {
      it("#then does not modify the output", async () => {
        const handler = createToolOutputTruncatorHandler() as (
          input: unknown,
          output: unknown,
        ) => Promise<void>;
        const input = { tool: "bash", sessionID: "s1", callID: "c1" };
        const output = {
          title: "bash result",
          output: 12345,
          metadata: {},
        };

        await handler(input, output);

        expect(output.output).toBe(12345);
      });
    });
  });

  describe("#given a tool not in the truncatable set", () => {
    describe("#when the handler processes the output", () => {
      it("#then leaves the output unchanged even if it exceeds limits", async () => {
        const handler = createToolOutputTruncatorHandler();
        const lines = Array.from({ length: 3000 }, (_, i) => `line ${i + 1}: content`);
        const original = lines.join("\n");
        const input = { tool: "Read", sessionID: "s1", callID: "c1", args: {} };
        const output = {
          title: "file content",
          output: original,
          metadata: {},
        };

        await handler(input, output);

        expect(output.output).toBe(original);
      });
    });
  });
});
