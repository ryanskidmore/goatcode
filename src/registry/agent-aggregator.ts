import type { PluginDefinition } from "../types/plugin"
import type { PluginAgentContribution } from "../types/agent"
import { log } from "../shared/logger"

export function aggregateAgents(
  plugins: PluginDefinition[],
  disabledAgents?: string[],
): Record<string, PluginAgentContribution> {
  const disabled = new Set(disabledAgents ?? [])
  const agents: Record<string, PluginAgentContribution> = {}
  const skippedAgents: string[] = []

  for (const plugin of plugins) {
    if (!plugin.agents) {
      continue
    }

    for (const [name, agent] of Object.entries(plugin.agents)) {
      if (disabled.has(name)) {
        skippedAgents.push(name)
        continue
      }

      if (agents[name]) {
        log(`[agent-aggregator] CONFLICT: Agent "${name}" from plugin "${plugin.name}" overwrites existing registration. To avoid this, ensure agent names are unique across plugins.`, {
          plugin: plugin.name,
          agent: name,
        })
      }
      agents[name] = agent
    }
  }

  if (skippedAgents.length > 0) {
    log(`[agent-aggregator] Skipped ${skippedAgents.length} disabled agent(s): ${skippedAgents.join(", ")}`)
  }

  return agents
}
