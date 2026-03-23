import { definePlugin } from "../../plugin-api/define-plugin"
import { safeCreateHook } from "../../shared/safe-create-hook"
import { createEmptyResponseDetectorHandler } from "./handler"

const toolExecuteAfterHook = safeCreateHook(
  "empty-response-detector",
  createEmptyResponseDetectorHandler,
)

export const emptyResponseDetectorPlugin = definePlugin({
  name: "empty-response-detector",
  version: "0.1.0",
  hooks: toolExecuteAfterHook
    ? {
        "tool.execute.after": toolExecuteAfterHook,
      }
    : {},
})
