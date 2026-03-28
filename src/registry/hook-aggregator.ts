import type { PluginDefinition, PluginHookHandler } from "../types/plugin"
import { aggregateContributions } from "./contribution-aggregator"

export function aggregateHooks(
  plugins: PluginDefinition[],
  disabledHooks?: string[],
): Map<string, PluginHookHandler[]> {
  return aggregateContributions<"hooks", PluginHookHandler>(plugins, "hooks", {
    disabled: disabledHooks,
    onConflict: "append",
  })
}
