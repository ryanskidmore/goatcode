import { log } from "../shared/logger"
import type { AggregatedPlugins, OpenCodeContext, PluginDefinition } from "../types/plugin"

import { aggregateAgents } from "./agent-aggregator"
import { resolvePluginOrder } from "./dependency-resolver"
import { aggregateHooks } from "./hook-aggregator"
import { aggregateTools } from "./tool-aggregator"

export class PluginRegistry {
  private readonly plugins = new Map<string, PluginDefinition>()

  register(plugin: PluginDefinition): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`)
    }
    this.plugins.set(plugin.name, plugin)
    log(`[PluginRegistry] Registered plugin: ${plugin.name}`)
  }

  resolve(): PluginDefinition[] {
    const result = resolvePluginOrder([...this.plugins.values()])
    log(`[PluginRegistry] Resolved ${result.order.length} plugins`)
    return result.order
  }

  aggregate(resolvedOrder: PluginDefinition[]): AggregatedPlugins {
    return {
      hooks: aggregateHooks(resolvedOrder),
      tools: aggregateTools(resolvedOrder),
      agents: aggregateAgents(resolvedOrder),
    }
  }

  async setup(resolvedOrder: PluginDefinition[], ctx: OpenCodeContext): Promise<void> {
    for (const plugin of resolvedOrder) {
      if (!plugin.setup) {
        continue
      }

      try {
        await plugin.setup(ctx)
      } catch (error) {
        log(`[PluginRegistry] Setup failed for plugin: ${plugin.name}`, { error })
      }
    }
  }

  async teardown(resolvedOrder: PluginDefinition[]): Promise<void> {
    for (const plugin of [...resolvedOrder].reverse()) {
      if (!plugin.teardown) {
        continue
      }

      try {
        await plugin.teardown()
      } catch (error) {
        log(`[PluginRegistry] Teardown failed for plugin: ${plugin.name}`, { error })
      }
    }
  }

  get registeredNames(): string[] {
    return [...this.plugins.keys()]
  }

  get size(): number {
    return this.plugins.size
  }
}
