import { definePlugin } from "../../plugin-api/define-plugin"
import { safeCreateHook } from "../../shared/safe-create-hook"
import { createTodoEnforcerHandler } from "./handler"

const sessionIdleEnforcer = safeCreateHook("todo-enforcer", createTodoEnforcerHandler)

export const todoEnforcerPlugin = definePlugin({
  name: "todo-enforcer",
  version: "0.1.0",
  hooks: sessionIdleEnforcer
    ? {
        event: sessionIdleEnforcer,
      }
    : {},
})
