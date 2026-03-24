import type { PluginToolContribution, ToolsRecord } from "../types/tool"
import { log } from "../shared/logger"

export function adaptToolsToRegistry(
  tools: Record<string, PluginToolContribution>,
): ToolsRecord {
  return { ...tools }
}

export function mergeToolRegistries(...registries: ToolsRecord[]): ToolsRecord {
  const result: ToolsRecord = {}
  for (const registry of registries) {
    for (const [name, tool] of Object.entries(registry)) {
      if (result[name]) {
        log(`[tool-registry-adapter] CONFLICT: Tool "${name}" already registered, overwriting`)
      }
      result[name] = tool
    }
  }
  return result
}
