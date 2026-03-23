import { definePlugin } from "../../plugin-api/define-plugin"
import { safeCreateHook } from "../../shared/safe-create-hook"
import { createStopGuardHandler } from "./handler"

const stopGuardHook = safeCreateHook("stop-guard", createStopGuardHandler)

export const stopGuardPlugin = definePlugin({
  name: "stop-guard",
  version: "0.1.0",
  hooks: stopGuardHook
    ? {
        "chat.message": stopGuardHook,
      }
    : {},
})
