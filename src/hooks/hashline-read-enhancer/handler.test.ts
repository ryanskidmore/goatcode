import { describe, it, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createHashlineReadEnhancerHandler } from "./handler";

const HASHLINE_PATTERN = /^[0-9]+#[ZPMQVRWSNKTXJBYH]{2}\|/;

describe("createHashlineReadEnhancerHandler", () => {
  describe("#given a Read tool output with content tags", () => {
    describe("#when the handler processes the output", () => {
      it("#then prepends LINE#HASH| to each file line inside content tags", async () => {
        const handler = createHashlineReadEnhancerHandler();
        const input = { tool: "read", sessionID: "s1", callID: "c1", args: {} };
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
    describe("#when the handler processes plain numbered lines", () => {
      it("#then hashifies each numbered line directly", async () => {
        const handler = createHashlineReadEnhancerHandler();
        const input = { tool: "read", sessionID: "s1", callID: "c1", args: {} };
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
        const input = { tool: "bash", sessionID: "s1", callID: "c1", args: {} };
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

  describe("#given a Read tool with empty output", () => {
    describe("#when the handler processes the output", () => {
      it("#then returns the empty output unchanged", async () => {
        const handler = createHashlineReadEnhancerHandler();
        const input = { tool: "read", sessionID: "s1", callID: "c1", args: {} };
        const output = {
          title: "empty.ts",
          output: "",
          metadata: {},
        };

        await handler(input, output);

        expect(output.output).toBe("");
      });
    });
  });

  describe("#given a Write tool with a valid file path", () => {
    describe("#when the handler processes the output", () => {
      it("#then replaces output with a line count summary", async () => {
        const handler = createHashlineReadEnhancerHandler();
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hashline-read-write-"));
        const filePath = path.join(tempDir, "demo.ts");
        fs.writeFileSync(filePath, "const x = 1\nconst y = 2");
        const input = { tool: "write", sessionID: "s1", callID: "c1", args: {} };
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
