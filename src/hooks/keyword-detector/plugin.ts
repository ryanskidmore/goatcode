import { definePlugin } from "../../plugin-api/define-plugin"
import { safeCreateHook } from "../../shared/safe-create-hook"
import { createKeywordDetectorHandler } from "./handler"

const chatMessageHook = safeCreateHook("keyword-detector", createKeywordDetectorHandler)

export const keywordDetectorPlugin = definePlugin({
  name: "keyword-detector",
  version: "0.1.0",
  hooks: chatMessageHook
    ? {
        "chat.message": chatMessageHook,
      }
    : {},
})
