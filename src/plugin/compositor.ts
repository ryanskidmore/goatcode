import type { Hooks } from "@opencode-ai/plugin"
import type { AggregatedPlugins, PluginHookHandler } from "../types/plugin"
import { log } from "../shared/logger"

const FUNCTION_HOOK_SLOTS = [
  "config",
  "chat.message",
  "chat.params",
  "chat.headers",
  "event",
  "tool.execute.before",
  "tool.execute.after",
  "experimental.chat.messages.transform",
  "experimental.chat.system.transform",
  "tool.definition",
] as const

function buildSlotHandler(handlers: PluginHookHandler[]): PluginHookHandler {
  if (handlers.length === 0) {
    return async () => {}
  }
  return async (input: unknown, output: unknown) => {
    for (const handler of handlers) {
      await handler(input, output)
    }
  }
}

/**
 * Compose aggregated plugin contributions into a complete OpenCode Hooks instance.
 * Produces all 11 handler slots (1 tool record + 10 function hooks).
 * The `config` slot injects agents before delegating to registered hooks.
 * Slots without registered handlers are defined as no-ops.
 */
export function compose(aggregated: AggregatedPlugins): Hooks {
  const hooks: Hooks = {}

  hooks.tool = aggregated.tools

  const configHandlers = aggregated.hooks.get("config") ?? []
  hooks.config = async (input) => {
    if (!input.agent) {
      input.agent = {}
    }
    for (const [name, agentConfig] of Object.entries(aggregated.agents)) {
      if (!input.agent[name]) {
        input.agent[name] = structuredClone(agentConfig)
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
  log(`[compositor] Composed plugin: ${toolCount} tools, ${agentCount} agents, 11 handler slots`)

  return hooks
}
