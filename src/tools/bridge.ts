import type { Hooks } from "@opencode-ai/plugin";
import type { PluginToolContribution } from "../types/tool";

/**
 * Convert the aggregated tools record into the SDK tool hook shape.
 * Returns undefined if no tools are registered.
 */
export function buildToolHook(tools: Record<string, PluginToolContribution>): Hooks["tool"] {
  if (Object.keys(tools).length === 0) {
    return undefined;
  }
  return tools;
}
