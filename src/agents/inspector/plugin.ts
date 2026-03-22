import { definePlugin } from "../../plugin-api"
import {
  INSPECTOR_MODEL,
  INSPECTOR_TEMPERATURE,
  INSPECTOR_MODE,
  INSPECTOR_ALLOWED_TOOLS,
} from "./config"
import { INSPECTOR_PROMPT } from "./prompt"

const tools: Record<string, boolean> = {}
for (const tool of INSPECTOR_ALLOWED_TOOLS) {
  tools[tool] = true
}

export const inspectorPlugin = definePlugin({
  name: "inspector",
  version: "0.1.0",
  agents: {
    inspector: {
      model: INSPECTOR_MODEL,
      temperature: INSPECTOR_TEMPERATURE,
      mode: INSPECTOR_MODE,
      prompt: INSPECTOR_PROMPT,
      tools,
    },
  },
})
