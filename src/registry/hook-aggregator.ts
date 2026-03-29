import type { PluginDefinition, PluginHookHandler } from "../types/plugin";
import { log } from "../shared/logger";
import { HOOK_TIERS, type HookTier } from "../hooks/hook-types";
import { getHookPriority, sortByPriority } from "../hooks/hook-ordering";

const TIER_PRIORITIES: Record<HookTier, number> = {
  config: 0,
  message: 10,
  transform: 20,
  event: 30,
  tool: 40,
};

export function aggregateHooks(
  plugins: PluginDefinition[],
  disabledHooks?: string[],
): Map<string, PluginHookHandler[]> {
  const disabled = new Set(disabledHooks ?? []);
  const hookMap = new Map<string, PluginHookHandler[]>();
  const skippedHooks: string[] = [];

  for (const plugin of plugins) {
    if (!plugin.hooks) {
      continue;
    }

    for (const [eventName, handler] of Object.entries(plugin.hooks)) {
      if (handler === undefined) {
        continue;
      }
      if (disabled.has(eventName)) {
        skippedHooks.push(eventName);
        continue;
      }

      const handlers = hookMap.get(eventName) ?? [];
      // Type cast is necessary: TypeScript cannot narrow the union type HookHandlerFor<Name>
      // in a generic loop. The cast is safe because each handler is registered under its
      // correct event name and will be called with the appropriate arguments by the compositor.
      handlers.push(handler as PluginHookHandler);
      hookMap.set(eventName, handlers);
    }
  }

  for (const [eventName, handlers] of hookMap.entries()) {
    const tier = HOOK_TIERS[eventName as keyof typeof HOOK_TIERS];
    const tierPriority = tier ? TIER_PRIORITIES[tier] : 100;
    const prioritized = handlers.map((handler, order) => ({
      handler,
      priority: tierPriority + getHookPriority(handler),
      order,
    }));
    hookMap.set(eventName, sortByPriority(prioritized));
  }

  if (skippedHooks.length > 0) {
    log(
      `[hook-aggregator] Skipped ${skippedHooks.length} disabled hook(s): ${skippedHooks.join(", ")}`,
    );
  }

  return hookMap;
}
