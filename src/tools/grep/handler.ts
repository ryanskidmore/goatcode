import { resolve } from "node:path"
import type { ToolDefinition } from "@opencode-ai/plugin"
import { buildTool } from "../tool-builder"
import { log } from "../../shared/logger"
import type { GrepArgs, GrepOutput } from "./types"
import { grepArgsSchema } from "./types"

type CommandResult = {
  exitCode: number
  stdout: string
  stderr: string
}

export type GrepCommandRunner = (command: string[], cwd: string) => Promise<CommandResult>

async function runGrepCommand(command: string[], cwd: string): Promise<CommandResult> {
  const process = Bun.spawn(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ])
  return { exitCode, stdout, stderr }
}

function buildGrepCommand(args: GrepArgs, baseDirectory: string): string[] {
  const outputMode = args.output_mode ?? "files_with_matches"
  const targetDirectory = args.path ? resolve(baseDirectory, args.path) : baseDirectory

  const command = ["grep", "-R", "-E", "--binary-files=without-match"]
  if (outputMode === "content") {
    command.push("--line-number")
  }
  if (outputMode === "files_with_matches") {
    command.push("-l")
  }
  if (outputMode === "count") {
    command.push("-c")
  }
  if (args.include) {
    command.push(`--include=${args.include}`)
  }

  command.push(args.pattern, targetDirectory)
  return command
}

function applyHeadLimit(output: string, headLimit: number): string {
  if (headLimit <= 0) {
    return output
  }
  const lines = output.split("\n").filter((line) => line.length > 0)
  return lines.slice(0, headLimit).join("\n")
}

export async function executeGrep(
  args: GrepArgs,
  context: { directory: string },
  runner: GrepCommandRunner = runGrepCommand,
): Promise<GrepOutput> {
  const command = buildGrepCommand(args, context.directory)
  log("grep executing", { command, directory: context.directory })

  try {
    const result = await runner(command, context.directory)
    if (result.exitCode === 1) {
      return "No matches found"
    }

    if (result.exitCode !== 0) {
      const errorOutput = result.stderr.trim() || result.stdout.trim()
      return `Error: ${errorOutput || "grep command failed"}`
    }

    const normalized = result.stdout.trim()
    if (normalized.length === 0) {
      return "No matches found"
    }

    const output = applyHeadLimit(normalized, args.head_limit ?? 0)
    return output.length > 0 ? output : "No matches found"
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log("grep failed", { message })
    return `Error: ${message}`
  }
}

export function createGrepTool(runner?: GrepCommandRunner): ToolDefinition {
  return buildTool({
    description:
      "Fast content search tool with safety limits (60s timeout, 256KB output). " +
      "Searches file contents using regular expressions. Supports full regex syntax (eg. \"log.*Error\", \"function\\s+\\w+\", etc.). " +
      "Filter files by pattern with the include parameter (eg. \"*.js\", \"*.{ts,tsx}\"). " +
      "Output modes: \"content\" shows matching lines, \"files_with_matches\" shows only file paths (default), \"count\" shows match counts per file.",
    args: grepArgsSchema as unknown as ToolDefinition["args"],
    execute: async (toolArgs, toolContext) => executeGrep(toolArgs as GrepArgs, toolContext, runner),
  })
}
