import { definePlugin } from "../../plugin-api/define-plugin"
import { safeCreateHook } from "../../shared/safe-create-hook"
import { createThinkModeHandler } from "./handler"

const chatParamsHook = safeCreateHook("think-mode", createThinkModeHandler)

export const thinkModePlugin = definePlugin({
  name: "think-mode",
  version: "0.1.0",
  hooks: chatParamsHook
    ? {
        "chat.params": chatParamsHook,
      }
    : {},
})
