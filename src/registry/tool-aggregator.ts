import type { PluginDefinition } from "../types/plugin"
import type { PluginToolContribution } from "../types/tool"
import { log } from "../shared/logger"

export function aggregateTools(plugins: PluginDefinition[]): Record<string, PluginToolContribution> {
  const tools: Record<string, PluginToolContribution> = {}

  for (const plugin of plugins) {
    if (!plugin.tools) {
      continue
    }

    for (const [name, tool] of Object.entries(plugin.tools)) {
      if (tools[name]) {
        log(`[tool-aggregator] Tool name conflict: "${name}" from plugin "${plugin.name}" overrides existing`, {
          plugin: plugin.name,
        })
      }
      tools[name] = tool
    }
  }

  return tools
}
