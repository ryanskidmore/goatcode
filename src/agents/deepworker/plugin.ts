import { definePlugin } from "../../plugin-api";
import { DEEP_WORKER_TEMPERATURE, DEEP_WORKER_MODE, DEEP_WORKER_DEFAULT_MODEL } from "./config";
import { DEEP_WORKER_PROMPT } from "./prompt";

export const deepWorkerPlugin = definePlugin({
  name: "deepworker",
  version: "0.1.0",
  agents: {
    deepworker: {
      model: DEEP_WORKER_DEFAULT_MODEL,
      temperature: DEEP_WORKER_TEMPERATURE,
      mode: DEEP_WORKER_MODE,
      prompt: DEEP_WORKER_PROMPT,
      color: "#7C3AED",
    },
  },
});
