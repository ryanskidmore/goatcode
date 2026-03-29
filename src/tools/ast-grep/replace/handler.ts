import { resolve } from "node:path";
import type { ToolDefinition } from "@opencode-ai/plugin";
import { buildTool } from "../../tool-builder";
import { log } from "../../../shared/logger";
import type { CommandRunner } from "../search/handler";
import { runCommand } from "../search/handler";
import type { AstGrepReplaceArgs, AstGrepReplaceOutput } from "./types";
import { astGrepReplaceArgsSchema } from "./types";

const SG_NOT_FOUND_MESSAGE =
  "Error: ast-grep binary 'sg' not found on PATH. Install ast-grep and retry.";

function buildReplaceCommand(args: AstGrepReplaceArgs, workingDirectory: string): string[] {
  const command = [
    "sg",
    "scan",
    "--pattern",
    args.pattern,
    "--rewrite",
    args.rewrite,
    "--lang",
    args.lang,
  ];

  for (const globPattern of args.globs ?? []) {
    command.push("--glob", globPattern);
  }

  if (args.dryRun === false) {
    command.push("--update-all");
  }

  const targetPaths = args.paths?.length ? args.paths : ["."];
  for (const targetPath of targetPaths) {
    command.push(resolve(workingDirectory, targetPath));
  }

  return command;
}

export async function executeAstGrepReplace(
  args: AstGrepReplaceArgs,
  context: { directory: string },
  runner: CommandRunner = runCommand,
): Promise<AstGrepReplaceOutput> {
  const command = buildReplaceCommand(args, context.directory);
  log("ast_grep_replace executing", {
    command,
    directory: context.directory,
    dryRun: args.dryRun !== false,
  });

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
    if (output.length > 0) {
      return args.dryRun === false ? output : `[DRY RUN]\n${output}`;
    }

    return "No matches found to replace";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ast_grep_replace failed", { message });
    if (message.includes("ENOENT") || message.includes("not found")) {
      return SG_NOT_FOUND_MESSAGE;
    }
    return `Error: ${message}`;
  }
}

export function createAstGrepReplaceTool(runner?: CommandRunner): ToolDefinition {
  return buildTool({
    description:
      "Replace code patterns across filesystem with AST-aware rewriting. " +
      "Dry-run by default. Use meta-variables in rewrite to preserve matched content. " +
      "Example: pattern='console.log($MSG)' rewrite='logger.info($MSG)'",
    args: astGrepReplaceArgsSchema as unknown as ToolDefinition["args"],
    execute: async (toolArgs, toolContext) =>
      executeAstGrepReplace(toolArgs as AstGrepReplaceArgs, toolContext, runner),
  });
}
