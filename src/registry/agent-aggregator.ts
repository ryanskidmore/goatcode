import type { PluginDefinition } from "../types/plugin"
import type { PluginAgentContribution } from "../types/agent"
import { log } from "../shared/logger"

export function aggregateAgents(plugins: PluginDefinition[]): Record<string, PluginAgentContribution> {
  const agents: Record<string, PluginAgentContribution> = {}

  for (const plugin of plugins) {
    if (!plugin.agents) {
      continue
    }

    for (const [name, agent] of Object.entries(plugin.agents)) {
      if (agents[name]) {
        log(`[agent-aggregator] Agent name conflict: "${name}" from plugin "${plugin.name}" overrides existing`, {
          plugin: plugin.name,
        })
      }
      agents[name] = agent
    }
  }

  return agents
}
