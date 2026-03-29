import { describe, it, expect, mock } from "bun:test";
import { createGrepTool } from "./handler";
import { createMockToolContext } from "../../test-utils";

describe("grepTool", () => {
  describe("#given a content output mode search", () => {
    describe("#when pattern matches files", () => {
      it("#then returns matching lines with line numbers", async () => {
        let capturedCommand: string[] = [];
        const runner = mock(async (command: string[], _cwd: string) => {
          capturedCommand = command;
          return {
            exitCode: 0,
            stdout: "src/a.ts:1:const log = console.log\nsrc/b.ts:5:log(error)",
            stderr: "",
          };
        });
        const tool = createGrepTool(runner);
        const ctx = createMockToolContext({ directory: "/repo" });

        const result = await tool.execute(
          { pattern: "log.*error", output_mode: "content", include: "*.ts" },
          ctx,
        );

        expect(capturedCommand).toContain("--line-number");
        expect(capturedCommand).toContain("--include=*.ts");
        expect(capturedCommand).not.toContain("-l");
        expect(capturedCommand).not.toContain("-c");
        expect(result).toContain("src/a.ts:1:");
        expect(result).toContain("src/b.ts:5:");
      });
    });
  });

  describe("#given a search with no matches", () => {
    describe("#when grep exits with code 1", () => {
      it("#then returns no matches found message", async () => {
        const runner = mock(async (_command: string[], _cwd: string) => ({
          exitCode: 1,
          stdout: "",
          stderr: "",
        }));
        const tool = createGrepTool(runner);
        const ctx = createMockToolContext({ directory: "/repo" });

        const result = await tool.execute(
          { pattern: "nonExistentPattern123" },
          ctx,
        );

        expect(result).toBe("No matches found");
      });
    });
  });

  describe("#given a count output mode search", () => {
    describe("#when pattern matches files", () => {
      it("#then includes -c flag and returns count output", async () => {
        let capturedCommand: string[] = [];
        const runner = mock(async (command: string[], _cwd: string) => {
          capturedCommand = command;
          return {
            exitCode: 0,
            stdout: "src/a.ts:5\nsrc/b.ts:3",
            stderr: "",
          };
        });
        const tool = createGrepTool(runner);
        const ctx = createMockToolContext({ directory: "/repo" });

        const result = await tool.execute(
          { pattern: "import", output_mode: "count" },
          ctx,
        );

        expect(capturedCommand).toContain("-c");
        expect(capturedCommand).not.toContain("--line-number");
        expect(capturedCommand).not.toContain("-l");
        expect(result).toContain("src/a.ts:5");
        expect(result).toContain("src/b.ts:3");
      });
    });
  });
});
