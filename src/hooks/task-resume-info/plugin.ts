import { definePlugin } from "../../plugin-api/define-plugin"
import { safeCreateHook } from "../../shared/safe-create-hook"
import { createTaskResumeInfoHandler } from "./handler"

const toolExecuteAfterHook = safeCreateHook("task-resume-info", createTaskResumeInfoHandler)

export const taskResumeInfoPlugin = definePlugin({
  name: "task-resume-info",
  version: "0.1.0",
  hooks: toolExecuteAfterHook
    ? {
        "tool.execute.after": toolExecuteAfterHook,
      }
    : {},
})
