import type { PluginHookContributions } from "../../types/hook"
import type { OpenCodeContext } from "../../types/plugin"
import { definePlugin } from "../../plugin-api"
import { safeCreateHook } from "../../shared/safe-create-hook"
import {
  createCompactionContextEventHandler,
  createCompactionContextSystemTransformHandler,
} from "./handler"

const sessionSnapshots = new Map<string, string>()
let eventHandler: PluginHookContributions["event"] | null = null
let systemTransformHandler: PluginHookContributions["experimental.chat.system.transform"] | null =
  null

export const compactionContextPlugin = definePlugin({
  name: "compaction-context",
  version: "0.1.0",
  setup: (ctx: OpenCodeContext) => {
    eventHandler = safeCreateHook("compaction-context:event", () =>
      createCompactionContextEventHandler(ctx.directory, sessionSnapshots),
    )
    systemTransformHandler = safeCreateHook("compaction-context:system-transform", () =>
      createCompactionContextSystemTransformHandler(sessionSnapshots),
    )
  },
  hooks: {
    event: async (input) => {
      if (!eventHandler) {
        return
      }
      await eventHandler(input)
    },
    "experimental.chat.system.transform": async (input, output) => {
      if (!systemTransformHandler) {
        return
      }
      await systemTransformHandler(input, output)
    },
  },
})
