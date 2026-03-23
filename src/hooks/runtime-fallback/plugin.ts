import { definePlugin } from "../../plugin-api"
import { safeCreateHook } from "../../shared/safe-create-hook"
import { createRuntimeFallbackHandler } from "./handler"

const runtimeFallbackEventHook = safeCreateHook("runtime-fallback", () =>
  createRuntimeFallbackHandler(),
)

export const runtimeFallbackPlugin = definePlugin({
  name: "runtime-fallback",
  version: "0.1.0",
  hooks: runtimeFallbackEventHook ? { event: runtimeFallbackEventHook } : undefined,
})
