import { definePlugin } from "../../plugin-api"
import {
  REVIEWER_MODEL,
  REVIEWER_TEMPERATURE,
  REVIEWER_MODE,
  REVIEWER_DENIED_TOOLS,
} from "./config"
import { REVIEWER_PROMPT } from "./prompt"

const deniedTools: Record<string, boolean> = {}
for (const tool of REVIEWER_DENIED_TOOLS) {
  deniedTools[tool] = false
}

export const reviewerPlugin = definePlugin({
  name: "reviewer",
  version: "0.1.0",
  agents: {
    reviewer: {
      model: REVIEWER_MODEL,
      temperature: REVIEWER_TEMPERATURE,
      mode: REVIEWER_MODE,
      prompt: REVIEWER_PROMPT,
      tools: deniedTools,
    },
  },
})
