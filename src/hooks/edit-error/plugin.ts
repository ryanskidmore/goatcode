import { definePlugin } from "../../plugin-api/define-plugin"
import { safeCreateHook } from "../../shared/safe-create-hook"
import { createEditErrorHandler } from "./handler"

const toolExecuteAfterHook = safeCreateHook("edit-error", createEditErrorHandler)

export const editErrorPlugin = definePlugin({
  name: "edit-error",
  version: "0.1.0",
  hooks: toolExecuteAfterHook
    ? {
        "tool.execute.after": toolExecuteAfterHook,
      }
    : {},
})
