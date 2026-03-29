import { definePlugin } from "../../plugin-api"
import {
  EXECUTOR_MODEL,
  EXECUTOR_TEMPERATURE,
  EXECUTOR_MODE,
} from "./config"
import { EXECUTOR_PROMPT } from "./prompt"

export const executorPlugin = definePlugin({
  name: "executor",
  version: "0.1.0",
  agents: {
    executor: {
      model: EXECUTOR_MODEL,
      temperature: EXECUTOR_TEMPERATURE,
      mode: EXECUTOR_MODE,
      prompt: EXECUTOR_PROMPT,
    },
  },
})
