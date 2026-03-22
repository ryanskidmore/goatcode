import type { PluginToolContribution, ToolsRecord } from "../types/tool"

export function adaptToolsToRegistry(
  tools: Record<string, PluginToolContribution>,
): ToolsRecord {
  return { ...tools }
}

export function mergeToolRegistries(...registries: ToolsRecord[]): ToolsRecord {
  return Object.assign({}, ...registries)
}
