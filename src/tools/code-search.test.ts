import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import { mkdtemp, rm, utimes, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { ToolDefinition } from "@opencode-ai/plugin"

import { astGrepSearchPlugin } from "./ast-grep/search/plugin"
import { createAstGrepSearchTool } from "./ast-grep/search/handler"
import { astGrepReplacePlugin } from "./ast-grep/replace/plugin"
import { createAstGrepReplaceTool } from "./ast-grep/replace/handler"
import { grepPlugin } from "./grep/plugin"
import { createGrepTool } from "./grep/handler"
import { globPlugin } from "./glob/plugin"
import { createGlobTool } from "./glob/handler"

type ToolContext = Parameters<ToolDefinition["execute"]>[1]

function createToolContext(directory: string): ToolContext {
  return {
    sessionID: "session-1",
    messageID: "message-1",
    agent: "agent-1",
    directory,
    worktree: directory,
    abort: new AbortController().signal,
    metadata: () => {},
    ask: async () => {},
  }
}

describe("code search tool micro-plugins", () => {
  describe("#given ast-grep plugins", () => {
    describe("#when inspecting exposed tool names", () => {
      it("#then they expose ast_grep_search and ast_grep_replace", () => {
        expect(astGrepSearchPlugin.tools).toHaveProperty("ast_grep_search")
        expect(astGrepReplacePlugin.tools).toHaveProperty("ast_grep_replace")
      })
    })

    describe("#when ast_grep_search executes with mocked shell runner", () => {
      it("#then it runs sg scan and returns runner output", async () => {
        let capturedCommand: string[] = []
        const runner = mock(async () => ({
          exitCode: 0,
          stdout: "src/main.ts:1:console.log(message)",
          stderr: "",
        }))
        runner.mockImplementation(async (command: string[]) => {
          capturedCommand = command
          return {
            exitCode: 0,
            stdout: "src/main.ts:1:console.log(message)",
            stderr: "",
          }
        })
        const tool = createAstGrepSearchTool(runner)

        const output = await tool.execute(
          { pattern: "console.log($MSG)", lang: "typescript", paths: ["src"], globs: ["*.ts"], context: 1 },
          createToolContext("/repo"),
        )

        expect(runner).toHaveBeenCalledTimes(1)
        expect(capturedCommand).toEqual([
          "sg",
          "scan",
          "--pattern",
          "console.log($MSG)",
          "--lang",
          "typescript",
          "--glob",
          "*.ts",
          "--context",
          "1",
          "/repo/src",
        ])
        expect(output).toContain("src/main.ts")
      })
    })

    describe("#when ast_grep_replace executes with dryRun false", () => {
      it("#then it includes --update-all and returns replacement output", async () => {
        let capturedCommand: string[] = []
        const runner = mock(async () => ({
          exitCode: 0,
          stdout: "updated src/main.ts",
          stderr: "",
        }))
        runner.mockImplementation(async (command: string[]) => {
          capturedCommand = command
          return {
            exitCode: 0,
            stdout: "updated src/main.ts",
            stderr: "",
          }
        })
        const tool = createAstGrepReplaceTool(runner)

        const output = await tool.execute(
          {
            pattern: "console.log($MSG)",
            rewrite: "log.info($MSG)",
            lang: "typescript",
            paths: ["src"],
            globs: ["*.ts"],
            dryRun: false,
          },
          createToolContext("/repo"),
        )

        expect(capturedCommand).toContain("--update-all")
        expect(output).toBe("updated src/main.ts")
      })
    })
  })

  describe("#given grep plugin", () => {
    describe("#when inspecting exposed tool names", () => {
      it("#then it exposes grep", () => {
        expect(grepPlugin.tools).toHaveProperty("grep")
      })
    })

    describe("#when grep executes with output_mode content and head_limit", () => {
      it("#then it formats the grep command and truncates result lines", async () => {
        let capturedCommand: string[] = []
        const runner = mock(async () => ({
          exitCode: 0,
          stdout: "src/a.ts:1:first\nsrc/b.ts:2:second\nsrc/c.ts:3:third",
          stderr: "",
        }))
        runner.mockImplementation(async (command: string[]) => {
          capturedCommand = command
          return {
            exitCode: 0,
            stdout: "src/a.ts:1:first\nsrc/b.ts:2:second\nsrc/c.ts:3:third",
            stderr: "",
          }
        })
        const tool = createGrepTool(runner)

        const output = await tool.execute(
          { pattern: "log.*Error", path: "src", include: "*.ts", output_mode: "content", head_limit: 2 },
          createToolContext("/repo"),
        )

        expect(capturedCommand).toContain("--line-number")
        expect(capturedCommand).toContain("--include=*.ts")
        expect(output).toBe("src/a.ts:1:first\nsrc/b.ts:2:second")
      })
    })
  })

  describe("#given glob plugin", () => {
    let tempDirectory = ""

    beforeEach(async () => {
      tempDirectory = await mkdtemp(join(tmpdir(), "goatcode-glob-test-"))
      await writeFile(join(tempDirectory, "older.ts"), "export const older = true")
      await writeFile(join(tempDirectory, "newer.ts"), "export const newer = true")

      const now = Date.now() / 1000
      await utimes(join(tempDirectory, "older.ts"), now - 10, now - 10)
      await utimes(join(tempDirectory, "newer.ts"), now, now)
    })

    afterEach(async () => {
      await rm(tempDirectory, { recursive: true, force: true })
    })

    describe("#when inspecting exposed tool names", () => {
      it("#then it exposes glob", () => {
        expect(globPlugin.tools).toHaveProperty("glob")
      })
    })

    describe("#when glob executes with a mocked scanner", () => {
      it("#then it returns files sorted by modified time", async () => {
        const scanner = mock(async () => ["older.ts", "newer.ts"])
        const tool = createGlobTool(scanner)

        const output = await tool.execute(
          { pattern: "*.ts" },
          createToolContext(tempDirectory),
        )

        expect(scanner).toHaveBeenCalledTimes(1)
        const lines = output.split("\n")
        expect(lines[0]).toBe(join(tempDirectory, "newer.ts"))
        expect(lines[1]).toBe(join(tempDirectory, "older.ts"))
      })
    })
  })
})
