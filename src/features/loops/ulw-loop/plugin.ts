import { definePlugin } from "../../../plugin-api"
import { safeCreateHook } from "../../../shared/safe-create-hook"
import { createUlwLoopHandler, type UlwLoopHandlerOptions } from "./handler"

export function createUlwLoopPlugin(options?: UlwLoopHandlerOptions) {
  const eventHook = safeCreateHook("ulw-loop", () => createUlwLoopHandler(options))

  return definePlugin({
    name: "ulw-loop",
    version: "0.1.0",
    hooks: eventHook ? { event: eventHook } : {},
  })
}

export const ulwLoopPlugin = createUlwLoopPlugin()
