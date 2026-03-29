import { describe, it, expect, mock } from "bun:test";
import { createAstGrepSearchTool } from "./handler";
import { createMockToolContext } from "../../../test-utils";

describe("astGrepSearchTool", () => {
  describe("#given a valid pattern and language", () => {
    describe("#when pattern matches code", () => {
      it("#then returns match output and builds correct command", async () => {
        let capturedCommand: string[] = [];
        const runner = mock(async (command: string[], _cwd: string) => {
          capturedCommand = command;
          return {
            exitCode: 0,
            stdout: "src/main.ts:1:console.log(message)",
            stderr: "",
          };
        });
        const tool = createAstGrepSearchTool(runner);
        const ctx = createMockToolContext({ directory: "/repo" });

        const result = await tool.execute(
          { pattern: "console.log($MSG)", lang: "typescript", globs: ["*.ts"], context: 2 },
          ctx,
        );

        expect(result).toBe("src/main.ts:1:console.log(message)");
        expect(runner).toHaveBeenCalledTimes(1);
        expect(capturedCommand[0]).toBe("sg");
        expect(capturedCommand).toContain("--pattern");
        expect(capturedCommand).toContain("console.log($MSG)");
        expect(capturedCommand).toContain("--lang");
        expect(capturedCommand).toContain("typescript");
        expect(capturedCommand).toContain("--glob");
        expect(capturedCommand).toContain("*.ts");
        expect(capturedCommand).toContain("--context");
        expect(capturedCommand).toContain("2");
      });
    });
  });

  describe("#given sg binary is not installed", () => {
    describe("#when command throws ENOENT", () => {
      it("#then returns helpful error message about missing binary", async () => {
        const runner = mock(async (_command: string[], _cwd: string) => {
          throw new Error("spawn sg ENOENT");
        });
        const tool = createAstGrepSearchTool(runner);
        const ctx = createMockToolContext({ directory: "/repo" });

        const result = await tool.execute(
          { pattern: "$VAR", lang: "javascript" },
          ctx,
        );

        expect(result).toContain("ast-grep binary 'sg' not found");
        expect(result).toContain("Install ast-grep");
      });
    });

    describe("#when runner returns non-zero exit with ENOENT in stderr", () => {
      it("#then returns helpful error message", async () => {
        const runner = mock(async (_command: string[], _cwd: string) => ({
          exitCode: 1,
          stdout: "",
          stderr: "error: ENOENT sg not found",
        }));
        const tool = createAstGrepSearchTool(runner);
        const ctx = createMockToolContext({ directory: "/repo" });

        const result = await tool.execute(
          { pattern: "$X", lang: "go" },
          ctx,
        );

        expect(result).toContain("ast-grep binary 'sg' not found");
      });
    });
  });

  describe("#given a pattern that matches nothing", () => {
    describe("#when runner returns empty stdout", () => {
      it("#then returns no matches message", async () => {
        const runner = mock(async (_command: string[], _cwd: string) => ({
          exitCode: 0,
          stdout: "",
          stderr: "",
        }));
        const tool = createAstGrepSearchTool(runner);
        const ctx = createMockToolContext({ directory: "/repo" });

        const result = await tool.execute(
          { pattern: "nonExistentPattern($$$)", lang: "typescript" },
          ctx,
        );

        expect(result).toBe("No matches found");
      });
    });
  });
});
