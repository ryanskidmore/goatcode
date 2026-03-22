import { definePlugin } from "../../plugin-api"
import {
  ADVISOR_MODEL,
  ADVISOR_TEMPERATURE,
  ADVISOR_MODE,
  ADVISOR_DENIED_TOOLS,
} from "./config"
import { ADVISOR_PROMPT } from "./prompt"

const deniedTools: Record<string, boolean> = {}
for (const tool of ADVISOR_DENIED_TOOLS) {
  deniedTools[tool] = false
}

export const advisorPlugin = definePlugin({
  name: "advisor",
  version: "0.1.0",
  agents: {
    advisor: {
      model: ADVISOR_MODEL,
      temperature: ADVISOR_TEMPERATURE,
      mode: ADVISOR_MODE,
      prompt: ADVISOR_PROMPT,
      tools: deniedTools,
    },
  },
})
