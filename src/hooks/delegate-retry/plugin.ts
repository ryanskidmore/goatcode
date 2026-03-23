import { definePlugin } from "../../plugin-api/define-plugin"
import { safeCreateHook } from "../../shared/safe-create-hook"
import { createDelegateRetryHandler } from "./handler"

const toolExecuteAfterHook = safeCreateHook("delegate-retry", createDelegateRetryHandler)

export const delegateRetryPlugin = definePlugin({
  name: "delegate-retry",
  version: "0.1.0",
  hooks: toolExecuteAfterHook
    ? {
        "tool.execute.after": toolExecuteAfterHook,
      }
    : {},
})
