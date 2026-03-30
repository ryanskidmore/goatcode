import { definePlugin } from "../../plugin-api";
import { DEEP_WORKER_TEMPERATURE, DEEP_WORKER_MODE } from "./config";
import { DEEP_WORKER_PROMPT } from "./prompt";

export const deepWorkerPlugin = definePlugin({
  name: "deep-worker",
  version: "0.1.0",
  agents: {
    "deep-worker": {
      temperature: DEEP_WORKER_TEMPERATURE,
      mode: DEEP_WORKER_MODE,
      prompt: DEEP_WORKER_PROMPT,
      color: "#7C3AED",
    },
  },
});
