import type { PluginDefinition } from "../types/plugin"
import type { PluginToolContribution } from "../types/tool"
import { log } from "../shared/logger"

export function aggregateTools(
  plugins: PluginDefinition[],
  disabledTools?: string[],
): Record<string, PluginToolContribution> {
  const disabled = new Set(disabledTools ?? [])
  const tools: Record<string, PluginToolContribution> = {}
  const skippedTools: string[] = []

  for (const plugin of plugins) {
    if (!plugin.tools) {
      continue
    }

    for (const [name, tool] of Object.entries(plugin.tools)) {
      if (disabled.has(name)) {
        skippedTools.push(name)
        continue
      }

      if (tools[name]) {
        log(`[tool-aggregator] CONFLICT: Tool "${name}" from plugin "${plugin.name}" overwrites existing registration. To avoid this, ensure tool names are unique across plugins.`, {
          plugin: plugin.name,
          tool: name,
        })
      }
      tools[name] = tool
    }
  }

  if (skippedTools.length > 0) {
    log(`[tool-aggregator] Skipped ${skippedTools.length} disabled tool(s): ${skippedTools.join(", ")}`)
  }

  return tools
}
