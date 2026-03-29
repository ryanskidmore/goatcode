import type { PluginDefinition } from "../types/plugin";
import type { PluginAgentContribution } from "../types/agent";
import { aggregateContributions } from "./contribution-aggregator";

export function aggregateAgents(
  plugins: PluginDefinition[],
  disabledAgents?: string[],
): Record<string, PluginAgentContribution> {
  return aggregateContributions<"agents", PluginAgentContribution>(plugins, "agents", {
    disabled: disabledAgents,
    onConflict: "replace",
  });
}
