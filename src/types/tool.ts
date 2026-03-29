import type { ToolDefinition } from "@opencode-ai/plugin";

/** Re-export for convenience. */
export type { ToolDefinition };

/** A tool contribution from a micro-plugin. */
export type PluginToolContribution = ToolDefinition;

/** Record of tools keyed by name. */
export type ToolsRecord = Record<string, ToolDefinition>;
