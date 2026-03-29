import type { PluginDefinition } from "../types/plugin"
import type { PluginToolContribution } from "../types/tool"
import { aggregateContributions } from "./contribution-aggregator"

export function aggregateTools(
  plugins: PluginDefinition[],
  disabledTools?: string[],
): Record<string, PluginToolContribution> {
  return aggregateContributions<"tools", PluginToolContribution>(plugins, "tools", {
    disabled: disabledTools,
    onConflict: "replace",
  })
}
