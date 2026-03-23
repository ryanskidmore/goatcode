import { definePlugin } from "../../plugin-api/define-plugin"
import { safeCreateHook } from "../../shared/safe-create-hook"
import { createToolOutputTruncatorHandler } from "./handler"

const toolExecuteAfterHook = safeCreateHook("tool-output-truncator", createToolOutputTruncatorHandler)

export const toolOutputTruncatorPlugin = definePlugin({
  name: "tool-output-truncator",
  version: "0.1.0",
  hooks: toolExecuteAfterHook
    ? {
        "tool.execute.after": toolExecuteAfterHook,
      }
    : {},
})
