import { log } from "../../shared/logger";
import type { SkillMcpArgs, ResolvedOperation } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function resolveOperation(args: SkillMcpArgs): ResolvedOperation {
  const candidates: ResolvedOperation[] = [];

  if (args.tool_name) candidates.push({ type: "tool", name: args.tool_name });
  if (args.resource_name) candidates.push({ type: "resource", name: args.resource_name });
  if (args.prompt_name) candidates.push({ type: "prompt", name: args.prompt_name });

  if (candidates.length === 0) {
    throw new Error(
      "Missing operation. Exactly one of tool_name, resource_name, or prompt_name must be specified.",
    );
  }

  if (candidates.length > 1) {
    const provided = candidates.map((c) => `${c.type}_name="${c.name}"`).join(", ");
    throw new Error(`Multiple operations specified: ${provided}. Provide exactly one.`);
  }

  return candidates[0];
}

export function parseArguments(
  raw: string | Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object") {
    if (!isRecord(raw)) {
      throw new Error("Arguments must be a JSON object");
    }
    return raw;
  }

  const normalized = raw.startsWith("'") && raw.endsWith("'") ? raw.slice(1, -1) : raw;
  try {
    const parsed: unknown = JSON.parse(normalized);
    if (!isRecord(parsed)) {
      throw new Error("Arguments must be a JSON object");
    }
    return parsed;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Invalid arguments JSON: ${msg}. Expected a valid JSON object, e.g.: '{"key": "value"}'`,
    );
  }
}

export function applyGrepFilter(output: string, pattern: string | undefined): string {
  if (!pattern) return output;
  try {
    const regex = new RegExp(escapeRegExp(pattern), "i");
    const lines = output.split("\n");
    const matched = lines.filter((line) => regex.test(line));
    return matched.length > 0 ? matched.join("\n") : `[grep] No lines matched pattern: ${pattern}`;
  } catch {
    return output;
  }
}

export async function executeSkillMcp(args: SkillMcpArgs): Promise<string> {
  log("skill_mcp.execute", { mcp_name: args.mcp_name });

  const operation = resolveOperation(args);
  const parsedArgs = parseArguments(args.arguments);
  void parsedArgs;

  return [
    `Error: skill_mcp tool is not yet available.`,
    `Operation: ${operation.type} "${operation.name}"`,
    `This tool requires MCP client integration that is pending implementation.`,
    `Use alternative tools or contact the goatcode maintainers.`,
  ].join("\n");
}
