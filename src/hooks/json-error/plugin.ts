import { definePlugin } from "../../plugin-api/define-plugin"
import { safeCreateHook } from "../../shared/safe-create-hook"
import { createJsonErrorHandler } from "./handler"

const toolExecuteAfterHook = safeCreateHook("json-error", createJsonErrorHandler)

export const jsonErrorPlugin = definePlugin({
  name: "json-error",
  version: "0.1.0",
  hooks: toolExecuteAfterHook
    ? {
        "tool.execute.after": toolExecuteAfterHook,
      }
    : {},
})
