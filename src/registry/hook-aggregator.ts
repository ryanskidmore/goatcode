import type { PluginDefinition, PluginHookHandler } from "../types/plugin"

export function aggregateHooks(plugins: PluginDefinition[]): Map<string, PluginHookHandler[]> {
  // TODO(priority): Hook priority system exists in src/hooks/hook-ordering.ts (sortByPriority,
  // withPriority) and src/hooks/hook-types.ts (HOOK_TIERS mapping each event to a tier).
  // Currently hooks execute in plugin registration order. To implement priority-based ordering:
  // 1. Import HOOK_TIERS from "../hooks/hook-types"
  // 2. After collecting all handlers for an event, sort by HOOK_TIERS[eventName] tier priority
  // 3. Use sortByPriority() from "../hooks/hook-ordering" for numeric priority within a tier
  // Note: importing from ../hooks/ here creates a cross-layer dependency — consider moving
  // HOOK_TIERS to src/types/ or src/shared/ to avoid the coupling.
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
      // Type cast is necessary: TypeScript cannot narrow the union type HookHandlerFor<Name>
      // in a generic loop. The cast is safe because each handler is registered under its
      // correct event name and will be called with the appropriate arguments by the compositor.
      handlers.push(handler as PluginHookHandler)
      hookMap.set(eventName, handlers)
    }
  }

  return hookMap
}
