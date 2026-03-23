import type { PluginHookContributions } from "../../types/hook"
import type { OpenCodeContext } from "../../types/plugin"
import { definePlugin } from "../../plugin-api"
import { safeCreateHook } from "../../shared/safe-create-hook"
import { createRulesInjectorHandler } from "./handler"

let systemTransformHandler: PluginHookContributions["experimental.chat.system.transform"] | null = null

export const rulesInjectorPlugin = definePlugin({
  name: "rules-injector",
  version: "0.1.0",
  setup: (ctx: OpenCodeContext) => {
    systemTransformHandler = safeCreateHook("rules-injector", () =>
      createRulesInjectorHandler(ctx.directory),
    )
  },
  hooks: {
    "experimental.chat.system.transform": async (input, output) => {
      if (!systemTransformHandler) {
        return
      }
      await systemTransformHandler(input, output)
    },
  },
})
