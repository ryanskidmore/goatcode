import type { PluginHookContributions } from "../../types/hook"
import type { OpenCodeContext } from "../../types/plugin"
import { definePlugin } from "../../plugin-api"
import { safeCreateHook } from "../../shared/safe-create-hook"
import { createAgentsInjectorHandler } from "./handlers/agents"
import { createReadmeInjectorHandler } from "./handlers/readme"
import { createRulesInjectorHandler } from "./handlers/rules"

let agentsToolAfterHandler: PluginHookContributions["tool.execute.after"] | null = null
let readmeToolAfterHandler: PluginHookContributions["tool.execute.after"] | null = null
let rulesTransformHandler: PluginHookContributions["experimental.chat.system.transform"] | null = null

const combinedToolAfterHandler: PluginHookContributions["tool.execute.after"] = async (input, output) => {
  if (agentsToolAfterHandler) {
    await agentsToolAfterHandler(input, output)
  }

  if (readmeToolAfterHandler) {
    await readmeToolAfterHandler(input, output)
  }
}

const rulesHandler: PluginHookContributions["experimental.chat.system.transform"] = async (
  input,
  output,
) => {
  if (!rulesTransformHandler) {
    return
  }

  await rulesTransformHandler(input, output)
}

export const contextInjectorPlugin = definePlugin({
  name: "context-injector",
  version: "0.2.0",
  setup: (ctx: OpenCodeContext) => {
    agentsToolAfterHandler = safeCreateHook("agents-injector", () =>
      createAgentsInjectorHandler(ctx.directory),
    )
    readmeToolAfterHandler = safeCreateHook("readme-injector", () =>
      createReadmeInjectorHandler(ctx.directory),
    )
    rulesTransformHandler = safeCreateHook("rules-injector", () =>
      createRulesInjectorHandler(ctx.directory),
    )
  },
  hooks: {
    "tool.execute.after": combinedToolAfterHandler,
    "experimental.chat.system.transform": rulesHandler,
  },
})
