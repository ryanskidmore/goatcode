import type { PluginHookContributions } from "../../types/hook"
import type { OpenCodeContext } from "../../types/plugin"
import { definePlugin } from "../../plugin-api"
import { safeCreateHook } from "../../shared/safe-create-hook"
import { createAgentsInjectorHandler } from "./handler"

let postToolUseHandler: PluginHookContributions["tool.execute.after"] | null = null

export const agentsInjectorPlugin = definePlugin({
  name: "agents-injector",
  version: "0.1.0",
  setup: (ctx: OpenCodeContext) => {
    postToolUseHandler = safeCreateHook("agents-injector", () =>
      createAgentsInjectorHandler(ctx.directory),
    )
  },
  hooks: {
    "tool.execute.after": async (input, output) => {
      if (!postToolUseHandler) {
        return
      }
      await postToolUseHandler(input, output)
    },
  },
})
