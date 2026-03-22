import type { PluginDefinition } from "../types/plugin"

import type { ResolvedPlugin, ResolutionResult } from "./types"

export function resolvePluginOrder(plugins: PluginDefinition[]): ResolutionResult {
  const pluginMap = new Map(plugins.map((plugin) => [plugin.name, plugin]))
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, string[]>()

  for (const plugin of plugins) {
    inDegree.set(plugin.name, inDegree.get(plugin.name) ?? 0)
    for (const dep of plugin.dependencies ?? []) {
      if (!pluginMap.has(dep)) {
        throw new Error(`Plugin "${plugin.name}" depends on unknown plugin "${dep}"`)
      }

      inDegree.set(plugin.name, (inDegree.get(plugin.name) ?? 0) + 1)
      const list = dependents.get(dep) ?? []
      list.push(plugin.name)
      dependents.set(dep, list)
    }
  }

  const queue = plugins.filter((plugin) => (inDegree.get(plugin.name) ?? 0) === 0).map((plugin) => plugin.name)
  const order: PluginDefinition[] = []

  while (queue.length > 0) {
    const name = queue.shift()
    if (!name) {
      break
    }

    const plugin = pluginMap.get(name)
    if (!plugin) {
      continue
    }
    order.push(plugin)

    for (const dependent of dependents.get(name) ?? []) {
      const next = (inDegree.get(dependent) ?? 0) - 1
      inDegree.set(dependent, next)
      if (next === 0) {
        queue.push(dependent)
      }
    }
  }

  if (order.length !== plugins.length) {
    const resolvedNames = new Set(order.map((plugin) => plugin.name))
    const remaining = plugins.filter((plugin) => !resolvedNames.has(plugin.name)).map((plugin) => plugin.name)
    throw new Error(`Circular dependency detected among plugins: ${remaining.join(", ")}`)
  }

  const resultMap = new Map<string, ResolvedPlugin>()
  order.forEach((plugin, orderIndex) => {
    resultMap.set(plugin.name, { plugin, order: orderIndex })
  })

  return { order, map: resultMap }
}
