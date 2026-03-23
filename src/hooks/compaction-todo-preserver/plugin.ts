import { definePlugin } from "../../plugin-api/define-plugin"
import { safeCreateHook } from "../../shared/safe-create-hook"
import { createCompactionTodoPreserverHandler } from "./handler"

const compactionTodoPreserver = safeCreateHook(
  "compaction-todo-preserver",
  createCompactionTodoPreserverHandler,
)

export const compactionTodoPreserverPlugin = definePlugin({
  name: "compaction-todo-preserver",
  version: "0.1.0",
  hooks: compactionTodoPreserver
    ? {
        event: compactionTodoPreserver,
      }
    : {},
})
