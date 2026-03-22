import type { Hooks } from "@opencode-ai/plugin"
import type { PluginHookHandler } from "../types/plugin"
import type { PluginToolContribution } from "../types/tool"

/** All hook keys in the SDK Hooks interface that are functions (not `tool` or `auth`). */
const FUNCTION_HOOK_KEYS = [
  "event",
  "config",
  "chat.message",
  "chat.params",
  "chat.headers",
  "permission.ask",
  "command.execute.before",
  "tool.execute.before",
  "shell.env",
  "tool.execute.after",
  "experimental.chat.messages.transform",
  "experimental.chat.system.transform",
  "experimental.session.compacting",
  "experimental.text.complete",
  "tool.definition",
] as const

/**
 * Build a merged Hooks object from aggregated plugin hook handlers and tools.
 *
 * For each hook key that has registered handlers, creates a wrapper function
 * that calls all handlers in sequence with the same (input, output) args.
 * Keys with no handlers are omitted.
 *
 * The `tool` key is populated from the tools record (not the hook map).
 * The `auth` key is not supported and is always omitted.
 */
export function buildHooks(
  hookMap: Map<string, PluginHookHandler[]>,
  tools: Record<string, PluginToolContribution>,
): Hooks {
  const hooks: Hooks = {}

  for (const key of FUNCTION_HOOK_KEYS) {
    const handlers = hookMap.get(key)
    if (!handlers || handlers.length === 0) {
      continue
    }
    // Dynamic key assignment requires Record<string, unknown> to avoid
    // TypeScript's inability to narrow the overloaded function type.
    ;(hooks as Record<string, unknown>)[key] = async (
      input: unknown,
      output: unknown,
    ) => {
      for (const handler of handlers) {
        await handler(input, output)
      }
    }
  }

  if (Object.keys(tools).length > 0) {
    hooks.tool = tools
  }

  return hooks
}
