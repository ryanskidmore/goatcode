import { describe, it, expect, mock } from "bun:test";
import { createAstGrepReplaceTool } from "./handler";
import { createMockToolContext } from "../../../test-utils";

describe("astGrepReplaceTool", () => {
  describe("#given a dry-run replacement", () => {
    describe("#when dryRun is not explicitly set to false", () => {
      it("#then does not include --update-all and prefixes output with [DRY RUN]", async () => {
        let capturedCommand: string[] = [];
        const runner = mock(async (command: string[], _cwd: string) => {
          capturedCommand = command;
          return {
            exitCode: 0,
            stdout: "would replace in src/main.ts",
            stderr: "",
          };
        });
        const tool = createAstGrepReplaceTool(runner);
        const ctx = createMockToolContext({ directory: "/repo" });

        const result = await tool.execute(
          {
            pattern: "console.log($MSG)",
            rewrite: "logger.info($MSG)",
            lang: "typescript",
          },
          ctx,
        );

        expect(capturedCommand[0]).toBe("sg");
        expect(capturedCommand[1]).toBe("run");
        expect(capturedCommand).not.toContain("--update-all");
        expect(result).toBe("[DRY RUN]\nwould replace in src/main.ts");
      });
    });
  });

  describe("#given a non-dry-run replacement", () => {
    describe("#when dryRun is false", () => {
      it("#then includes --update-all and returns raw output", async () => {
        let capturedCommand: string[] = [];
        const runner = mock(async (command: string[], _cwd: string) => {
          capturedCommand = command;
          return {
            exitCode: 0,
            stdout: "updated src/main.ts",
            stderr: "",
          };
        });
        const tool = createAstGrepReplaceTool(runner);
        const ctx = createMockToolContext({ directory: "/repo" });

        const result = await tool.execute(
          {
            pattern: "console.log($MSG)",
            rewrite: "logger.info($MSG)",
            lang: "typescript",
            dryRun: false,
          },
          ctx,
        );

        expect(capturedCommand).toContain("--update-all");
        expect(capturedCommand).toContain("--rewrite");
        expect(capturedCommand).toContain("logger.info($MSG)");
        expect(result).toBe("updated src/main.ts");
      });
    });
  });

  describe("#given a pattern that matches nothing", () => {
    describe("#when runner returns empty stdout", () => {
      it("#then returns no matches to replace message", async () => {
        const runner = mock(async (_command: string[], _cwd: string) => ({
          exitCode: 0,
          stdout: "",
          stderr: "",
        }));
        const tool = createAstGrepReplaceTool(runner);
        const ctx = createMockToolContext({ directory: "/repo" });

        const result = await tool.execute(
          {
            pattern: "nonExistent($$$)",
            rewrite: "replacement($$$)",
            lang: "typescript",
          },
          ctx,
        );

        expect(result).toBe("No matches found to replace");
      });
    });
  });
});
