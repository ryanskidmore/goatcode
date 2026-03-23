import type { PluginHookContributions } from "../../types/hook"
import { definePlugin } from "../../plugin-api/define-plugin"
import { safeCreateHook } from "../../shared/safe-create-hook"
import { createTodowriteDisablerHandler } from "./handler"

const handlersBySession = new Map<string, NonNullable<PluginHookContributions["tool.execute.before"]>>()

export const todowriteDisablerPlugin = definePlugin({
  name: "todowrite-disabler",
  version: "0.1.0",
  hooks: {
    "chat.message": async (input, _output) => {
      const typedInput = input as { sessionID?: string; agent?: string }
      const sessionID = typedInput.sessionID
      const agent = typedInput.agent
      if (typeof sessionID === "string" && sessionID && typeof agent === "string" && agent) {
        const handler = safeCreateHook("todowrite-disabler", () =>
          createTodowriteDisablerHandler(agent),
        )
        if (handler) {
          handlersBySession.set(sessionID, handler)
        }
      }
    },
    "tool.execute.before": async (input, output) => {
      const typedInput = input as { sessionID?: string }
      const sessionID = typedInput.sessionID
      const handler = typeof sessionID === "string" ? handlersBySession.get(sessionID) : undefined
      if (handler) {
        await handler(input, output)
      }
    },
    event: async (input) => {
      const evt = (input as { event?: { type?: string; properties?: unknown } }).event
      if (evt?.type === "session.deleted") {
        const props = evt.properties as Record<string, unknown> | undefined
        const sessionID = (
          props?.sessionID ??
          (props?.info as Record<string, unknown> | undefined)?.id
        ) as string | undefined
        if (sessionID) handlersBySession.delete(sessionID)
      }
    },
  },
})
