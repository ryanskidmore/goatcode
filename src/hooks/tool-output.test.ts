import { describe, it, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createToolOutputTruncatorHandler } from "./tool-output-truncator/handler";
import { createHashlineReadEnhancerHandler } from "./hashline-read-enhancer/handler";
import {
  createHashlineDiffEnhancerBeforeHandler,
  createHashlineDiffEnhancerAfterHandler,
} from "./hashline-diff-enhancer/handler";

const HASHLINE_PATTERN = /^[0-9]+#[ZPMQVRWSNKTXJBYH]{2}\|/;

describe("tool-output-truncator", () => {
  describe("#given a grep tool with output exceeding 2000 lines", () => {
    describe("#when the handler processes the output", () => {
      it("#then truncates the output and appends a notice with file path", async () => {
        const handler = createToolOutputTruncatorHandler();
        const lines = Array.from({ length: 3000 }, (_, i) => `line ${i + 1}: some content here`);
        const input = { tool: "grep", sessionID: "s1", callID: "c1" };
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

  describe("#given a Read tool (not in truncatable list)", () => {
    describe("#when the handler processes the output", () => {
      it("#then does not truncate the output", async () => {
        const handler = createToolOutputTruncatorHandler();
        const lines = Array.from({ length: 3000 }, (_, i) => `line ${i + 1}: content`);
        const original = lines.join("\n");
        const input = { tool: "Read", sessionID: "s1", callID: "c1" };
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

  describe("#given a bash tool with output within limits", () => {
    describe("#when the handler processes the output", () => {
      it("#then leaves the output unchanged", async () => {
        const handler = createToolOutputTruncatorHandler();
        const original = "short output";
        const input = { tool: "bash", sessionID: "s1", callID: "c1" };
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
});

describe("hashline-read-enhancer", () => {
  describe("#given a Read tool output with content tags", () => {
    describe("#when the handler processes the output", () => {
      it("#then prepends LINE#ID hashes to each file line", async () => {
        const handler = createHashlineReadEnhancerHandler();
        const input = { tool: "read", sessionID: "s1", callID: "c1" };
        const output = {
          title: "demo.ts",
          output: [
            "<path>/tmp/demo.ts</path>",
            "<type>file</type>",
            "<content>",
            "1: const x = 1",
            "2: const y = 2",
            "</content>",
          ].join("\n"),
          metadata: {},
        };

        await handler(input, output);

        const lines = output.output.split("\n");
        expect(lines[3]).toMatch(HASHLINE_PATTERN);
        expect(lines[3]).toContain("const x = 1");
        expect(lines[4]).toMatch(HASHLINE_PATTERN);
        expect(lines[4]).toContain("const y = 2");
      });
    });
  });

  describe("#given a Read tool output without content tags", () => {
    describe("#when the handler processes the output", () => {
      it("#then hashifies plain numbered lines", async () => {
        const handler = createHashlineReadEnhancerHandler();
        const input = { tool: "read", sessionID: "s1", callID: "c1" };
        const output = {
          title: "README.md",
          output: ["1: # Title", "2: Some content", "3: More content"].join("\n"),
          metadata: {},
        };

        await handler(input, output);

        const lines = output.output.split("\n");
        expect(lines[0]).toMatch(HASHLINE_PATTERN);
        expect(lines[0]).toContain("# Title");
        expect(lines[1]).toMatch(HASHLINE_PATTERN);
        expect(lines[2]).toMatch(HASHLINE_PATTERN);
      });
    });
  });

  describe("#given a non-Read tool", () => {
    describe("#when the handler processes the output", () => {
      it("#then leaves the output unchanged", async () => {
        const handler = createHashlineReadEnhancerHandler();
        const input = { tool: "bash", sessionID: "s1", callID: "c1" };
        const original = "1: some output";
        const output = {
          title: "bash",
          output: original,
          metadata: {},
        };

        await handler(input, output);

        expect(output.output).toBe(original);
      });
    });
  });

  describe("#given a Write tool with a valid file", () => {
    describe("#when the handler processes the output", () => {
      it("#then replaces output with line count summary", async () => {
        const handler = createHashlineReadEnhancerHandler();
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashline-write-"));
        const filePath = path.join(tempDir, "demo.ts");
        fs.writeFileSync(filePath, "const x = 1\nconst y = 2");
        const input = { tool: "write", sessionID: "s1", callID: "c1" };
        const output = {
          title: "write",
          output: "Wrote file successfully.",
          metadata: { filepath: filePath },
        };

        await handler(input, output);

        expect(output.output).toContain("File written successfully.");
        expect(output.output).toContain("2 lines written.");

        fs.rmSync(tempDir, { recursive: true, force: true });
      });
    });
  });
});

describe("hashline-diff-enhancer", () => {
  describe("#given a Write tool that modifies an existing file", () => {
    describe("#when before and after handlers both run", () => {
      it("#then metadata contains diff and hashlined content", async () => {
        const beforeHandler = createHashlineDiffEnhancerBeforeHandler();
        const afterHandler = createHashlineDiffEnhancerAfterHandler();

        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashline-diff-"));
        const filePath = path.join(tempDir, "test.ts");
        fs.writeFileSync(filePath, "const a = 1\nconst b = 2\n");

        const sessionID = "s1";
        const callID = "c1";
        const beforeInput = { tool: "write", sessionID, callID };
        const beforeOutput = { args: { filePath } };

        await beforeHandler(beforeInput, beforeOutput);

        fs.writeFileSync(filePath, "const a = 1\nconst b = 2\nconst c = 3\n");

        const afterInput = { tool: "write", sessionID, callID };
        const afterOutput = {
          title: "write",
          output: "File written successfully.",
          metadata: {} as Record<string, unknown>,
        };

        await afterHandler(afterInput, afterOutput);

        expect(afterOutput.metadata.diff).toBeDefined();
        expect(typeof afterOutput.metadata.diff).toBe("string");
        expect(afterOutput.metadata.hashlined).toBeDefined();
        const hashlined = afterOutput.metadata.hashlined as string;
        expect(hashlined).toMatch(HASHLINE_PATTERN);
        expect(afterOutput.title).toBe(filePath);

        fs.rmSync(tempDir, { recursive: true, force: true });
      });
    });
  });

  describe("#given a non-Write tool", () => {
    describe("#when the before handler processes the input", () => {
      it("#then does not capture any state", async () => {
        const beforeHandler = createHashlineDiffEnhancerBeforeHandler();
        const input = { tool: "read", sessionID: "s1", callID: "c1" };
        const output = { args: { filePath: "/some/file.ts" } };

        await beforeHandler(input, output);

        const afterHandler = createHashlineDiffEnhancerAfterHandler();
        const afterInput = { tool: "read", sessionID: "s1", callID: "c1" };
        const afterOutput = {
          title: "read",
          output: "file content",
          metadata: {} as Record<string, unknown>,
        };

        await afterHandler(afterInput, afterOutput);

        expect(afterOutput.metadata.diff).toBeUndefined();
      });
    });
  });
});
