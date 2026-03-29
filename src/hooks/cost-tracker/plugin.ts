import { definePlugin } from "../../plugin-api/define-plugin"
import { createChatParamsHandler, createEventHandler } from "./handler"

export const costTrackerPlugin = definePlugin({
  name: "cost-tracker",
  version: "0.1.0",
  hooks: {
    "chat.params": createChatParamsHandler(),
    event: createEventHandler(),
  },
})
