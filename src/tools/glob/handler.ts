import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { ToolDefinition } from "@opencode-ai/plugin";
import { buildTool } from "../tool-builder";
import { log } from "../../shared/logger";
import type { GlobArgs, GlobOutput } from "./types";
import { globArgsSchema } from "./types";

const MAX_FILES = 100;

type FileMatch = {
  path: string;
  mtimeMs: number;
};

export type GlobScanner = (pattern: string, cwd: string) => Promise<string[]>;

async function scanFiles(pattern: string, cwd: string): Promise<string[]> {
  const glob = new Bun.Glob(pattern);
  const matches: string[] = [];
  for await (const match of glob.scan({ cwd })) {
    matches.push(match);
  }
  return matches;
}

async function collectWithMtime(cwd: string, paths: string[]): Promise<FileMatch[]> {
  const files = await Promise.all(
    paths.map(async (relativePath) => {
      const absolutePath = resolve(cwd, relativePath);
      const fileStats = await stat(absolutePath);
      return { path: absolutePath, mtimeMs: fileStats.mtimeMs };
    }),
  );

  return files.sort((left, right) => right.mtimeMs - left.mtimeMs);
}

export async function executeGlob(
  args: GlobArgs,
  context: { directory: string },
  scanner: GlobScanner = scanFiles,
): Promise<GlobOutput> {
  const searchDirectory = args.path ? resolve(context.directory, args.path) : context.directory;
  log("glob executing", { pattern: args.pattern, searchDirectory });

  try {
    const paths = await scanner(args.pattern, searchDirectory);
    if (paths.length === 0) {
      return "No files found";
    }

    const files = await collectWithMtime(searchDirectory, paths);
    const limited = files.slice(0, MAX_FILES);
    return limited.map((file) => file.path).join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("glob failed", { message });
    return `Error: ${message}`;
  }
}

export function createGlobTool(scanner?: GlobScanner): ToolDefinition {
  return buildTool({
    description:
      "Fast file pattern matching tool with safety limits (60s timeout, 100 file limit). " +
      'Supports glob patterns like "**/*.js" or "src/**/*.ts". ' +
      "Returns matching file paths sorted by modification time. " +
      "Use this tool when you need to find files by name patterns.",
    args: globArgsSchema as unknown as ToolDefinition["args"],
    execute: async (toolArgs, toolContext) =>
      executeGlob(toolArgs as GlobArgs, toolContext, scanner),
  });
}
