import { definePlugin } from "../../plugin-api"
import { createEventErrorHandler, createToolErrorHandler } from "./handler"

export const errorDiagnosticsPlugin = definePlugin({
  name: "error-diagnostics",
  version: "0.1.0",
  hooks: {
    "tool.execute.after": createToolErrorHandler(),
    event: createEventErrorHandler(),
  },
})
