import { definePlugin } from "../../plugin-api"
import { REVIEWER_MODEL, REVIEWER_TEMPERATURE, REVIEWER_MODE } from "./config"
import { REVIEWER_PROMPT } from "./prompt"
import { buildToolsMap } from "../tool-restrictions"

export const reviewerPlugin = definePlugin({
  name: "reviewer",
  version: "0.1.0",
  agents: {
    reviewer: {
      model: REVIEWER_MODEL,
      temperature: REVIEWER_TEMPERATURE,
      mode: REVIEWER_MODE,
      prompt: REVIEWER_PROMPT,
      tools: buildToolsMap("reviewer"),
    },
  },
})
