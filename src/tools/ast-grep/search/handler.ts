import { resolve } from "node:path";
import type { ToolDefinition } from "@opencode-ai/plugin";
import { buildTool } from "../../tool-builder";
import { log } from "../../../shared/logger";
import type { AstGrepSearchArgs, AstGrepSearchOutput } from "./types";
import { astGrepSearchArgsSchema } from "./types";

type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type CommandRunner = (command: string[], cwd: string) => Promise<CommandResult>;

const SG_NOT_FOUND_MESSAGE =
  "Error: ast-grep binary 'sg' not found on PATH. Install ast-grep and retry.";

export async function runCommand(command: string[], cwd: string): Promise<CommandResult> {
  const process = Bun.spawn(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  return { exitCode, stdout, stderr };
}

function buildSearchCommand(args: AstGrepSearchArgs, workingDirectory: string): string[] {
  const command = ["sg", "scan", "--pattern", args.pattern, "--lang", args.lang];

  for (const globPattern of args.globs ?? []) {
    command.push("--glob", globPattern);
  }

  if (typeof args.context === "number") {
    command.push("--context", args.context.toString());
  }

  const targetPaths = args.paths?.length ? args.paths : ["."];
  for (const targetPath of targetPaths) {
    command.push(resolve(workingDirectory, targetPath));
  }

  return command;
}

export async function executeAstGrepSearch(
  args: AstGrepSearchArgs,
  context: { directory: string },
  runner: CommandRunner = runCommand,
): Promise<AstGrepSearchOutput> {
  const command = buildSearchCommand(args, context.directory);
  log("ast_grep_search executing", { command, directory: context.directory });

  try {
    const result = await runner(command, context.directory);
    if (result.exitCode !== 0) {
      const errorOutput = result.stderr.trim() || result.stdout.trim();
      if (errorOutput.includes("ENOENT") || errorOutput.includes("not found")) {
        return SG_NOT_FOUND_MESSAGE;
      }
      return `Error: ${errorOutput || "ast-grep command failed"}`;
    }

    const output = result.stdout.trim();
    return output.length > 0 ? output : "No matches found";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ast_grep_search failed", { message });
    if (message.includes("ENOENT") || message.includes("not found")) {
      return SG_NOT_FOUND_MESSAGE;
    }
    return `Error: ${message}`;
  }
}

export function createAstGrepSearchTool(runner?: CommandRunner): ToolDefinition {
  return buildTool({
    description:
      "Search code patterns across filesystem using AST-aware matching. Supports 25 languages. " +
      "Use meta-variables: $VAR (single node), $$$ (multiple nodes). IMPORTANT: Patterns must be complete AST nodes (valid code). " +
      "For functions, include params and body: 'export async function $NAME($$$) { $$$ }' not 'export async function $NAME'. " +
      "Examples: 'console.log($MSG)', 'def $FUNC($$$):', 'async function $NAME($$$)'",
    args: astGrepSearchArgsSchema as unknown as ToolDefinition["args"],
    execute: async (toolArgs, toolContext) =>
      executeAstGrepSearch(toolArgs as AstGrepSearchArgs, toolContext, runner),
  });
}
