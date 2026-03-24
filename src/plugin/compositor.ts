import type { Hooks } from "@opencode-ai/plugin"
import type { AggregatedPlugins, PluginHookHandler } from "../types/plugin"
import { log } from "../shared/logger"
import { HOOK_EVENT_NAMES } from "../types/hook"

const FUNCTION_HOOK_SLOTS = HOOK_EVENT_NAMES.filter(
  (name): name is Exclude<(typeof HOOK_EVENT_NAMES)[number], "tool"> => name !== "tool",
) as readonly Exclude<(typeof HOOK_EVENT_NAMES)[number], "tool">[]

function buildSlotHandler(handlers: PluginHookHandler[]): PluginHookHandler {
  if (handlers.length === 0) {
    return async () => {}
  }
  return async (input: unknown, output: unknown) => {
    for (const handler of handlers) {
      try {
        await handler(input, output)
      } catch (err) {
        log(`[compositor] Handler error: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }
}

/**
 * Compose aggregated plugin contributions into a complete OpenCode Hooks instance.
 * Produces all handler slots (1 tool record + function hooks).
 * The `config` slot injects agents before delegating to registered hooks.
 * Slots without registered handlers are defined as no-ops.
 */
export function compose(aggregated: AggregatedPlugins): Hooks {
  const hooks: Hooks = {}

  hooks.tool = structuredClone(aggregated.tools)

  const configHandlers = aggregated.hooks.get("config") ?? []
  hooks.config = async (input) => {
    if (!input.agent) {
      input.agent = {}
    }
    for (const [name, agentConfig] of Object.entries(aggregated.agents)) {
      if (!input.agent[name]) {
        input.agent[name] = {
          ...agentConfig,
          tools: agentConfig.tools ? { ...agentConfig.tools } : undefined,
        }
      }
    }
    for (const handler of configHandlers) {
      await handler(input)
    }
  }

  for (const key of FUNCTION_HOOK_SLOTS) {
    if (key === "config") continue
    const handlers = aggregated.hooks.get(key) ?? []
    ;(hooks as Record<typeof key, PluginHookHandler>)[key] = buildSlotHandler(handlers)
  }

  const toolCount = Object.keys(aggregated.tools).length
  const agentCount = Object.keys(aggregated.agents).length
  log(
    `[compositor] Composed plugin: ${toolCount} tools, ${agentCount} agents, ${HOOK_EVENT_NAMES.length} handler slots`,
  )

  return hooks
}
