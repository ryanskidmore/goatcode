import { definePlugin } from "../../../plugin-api"
import { safeCreateHook } from "../../../shared/safe-create-hook"
import { createRalphLoopHandler, type RalphLoopHandlerOptions } from "./handler"

export function createRalphLoopPlugin(options?: RalphLoopHandlerOptions) {
  const eventHook = safeCreateHook("ralph-loop", () => createRalphLoopHandler(options))

  return definePlugin({
    name: "ralph-loop",
    version: "0.1.0",
    hooks: eventHook ? { event: eventHook } : {},
  })
}

export const ralphLoopPlugin = createRalphLoopPlugin()
