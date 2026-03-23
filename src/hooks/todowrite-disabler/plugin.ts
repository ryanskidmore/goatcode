import type { PluginHookContributions } from "../../types/hook"
import { definePlugin } from "../../plugin-api/define-plugin"
import { safeCreateHook } from "../../shared/safe-create-hook"
import { createTodowriteDisablerHandler } from "./handler"

let agentName: string | undefined
let preToolUseHandler: PluginHookContributions["tool.execute.before"] | null = null

export const todowriteDisablerPlugin = definePlugin({
  name: "todowrite-disabler",
  version: "0.1.0",
  hooks: {
    "chat.message": async (input, _output) => {
      const typedInput = input as { agent?: string }
      if (typeof typedInput.agent === "string" && typedInput.agent) {
        agentName = typedInput.agent
        preToolUseHandler = safeCreateHook("todowrite-disabler", () =>
          createTodowriteDisablerHandler(agentName),
        )
      }
    },
    "tool.execute.before": async (input, output) => {
      if (!preToolUseHandler) {
        return
      }
      await preToolUseHandler(input, output)
    },
  },
})
