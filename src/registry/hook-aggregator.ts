import type { PluginDefinition, PluginHookHandler } from "../types/plugin"

export function aggregateHooks(plugins: PluginDefinition[]): Map<string, PluginHookHandler[]> {
  const hookMap = new Map<string, PluginHookHandler[]>()

  for (const plugin of plugins) {
    if (!plugin.hooks) {
      continue
    }

    for (const [eventName, handler] of Object.entries(plugin.hooks)) {
      if (handler === undefined) {
        continue
      }

      const handlers = hookMap.get(eventName) ?? []
      handlers.push(handler as PluginHookHandler)
      hookMap.set(eventName, handlers)
    }
  }

  return hookMap
}
