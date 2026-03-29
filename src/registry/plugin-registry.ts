import { log } from "../shared/logger";
import type { AggregatedPlugins, OpenCodeContext, PluginDefinition } from "../types/plugin";

import { aggregateAgents } from "./agent-aggregator";
import { resolvePluginOrder } from "./dependency-resolver";
import { aggregateHooks } from "./hook-aggregator";
import { aggregateTools } from "./tool-aggregator";

export interface AggregateOptions {
  disabledAgents?: string[];
  disabledHooks?: string[];
  disabledTools?: string[];
}

export class PluginRegistry {
  private readonly plugins = new Map<string, PluginDefinition>();

  register(plugin: PluginDefinition): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }
    this.plugins.set(plugin.name, plugin);
    log(`[PluginRegistry] Registered plugin: ${plugin.name}`);
  }

  resolve(): PluginDefinition[] {
    const result = resolvePluginOrder([...this.plugins.values()]);
    log(`[PluginRegistry] Resolved ${result.order.length} plugins`);
    return result.order;
  }

  aggregate(resolvedOrder: PluginDefinition[], options?: AggregateOptions): AggregatedPlugins {
    return {
      hooks: aggregateHooks(resolvedOrder, options?.disabledHooks),
      tools: aggregateTools(resolvedOrder, options?.disabledTools),
      agents: aggregateAgents(resolvedOrder, options?.disabledAgents),
    };
  }

  async setup(
    resolvedOrder: PluginDefinition[],
    ctx: OpenCodeContext,
  ): Promise<PluginDefinition[]> {
    const successful: PluginDefinition[] = [];
    for (const plugin of resolvedOrder) {
      if (!plugin.setup) {
        successful.push(plugin);
        continue;
      }

      try {
        await plugin.setup(ctx);
        successful.push(plugin);
      } catch (error) {
        log(`[PluginRegistry] Setup failed for plugin: ${plugin.name}`, { error });
      }
    }
    return successful;
  }

  async teardown(resolvedOrder: PluginDefinition[]): Promise<void> {
    for (const plugin of [...resolvedOrder].reverse()) {
      if (!plugin.teardown) {
        continue;
      }

      try {
        await plugin.teardown();
      } catch (error) {
        log(`[PluginRegistry] Teardown failed for plugin: ${plugin.name}`, { error });
      }
    }
  }

  get registeredNames(): string[] {
    return [...this.plugins.keys()];
  }

  get size(): number {
    return this.plugins.size;
  }
}
